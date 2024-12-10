#!/usr/bin/env python3

import sys

# check python version
if sys.version_info[0] < 3:
    print("ERROR: This script must be run with Python 3!")
    sys.exit(-1)

import argparse
import venv
from os import environ, symlink
from os.path import join, abspath, dirname, exists
from subprocess import run

DEV_DIR = abspath(dirname(__file__))
ROOT_DIR = dirname(DEV_DIR)
ROOT_VENV_DIR = join(ROOT_DIR, ".venv")

DATA_SCHEMA_DIR = join(ROOT_DIR, "schema")

BKE_DIR = join(ROOT_DIR, "backend")
BKE_VENV_DIR = join(BKE_DIR, ".venv")
FTE_DIR = join(ROOT_DIR, "frontend")


def init():
    print("# Init backend")

    print("## Setting up Python virtual environment")
    if sys.version_info[1] < 13:
        print("ERROR: Python virtual environment must be set up with Python 3.13+ to match runtime environment!")
        sys.exit(-1)
    venv.create(BKE_VENV_DIR, clear=False, with_pip=True)

    print("## Installing Python dependencies")
    run_cmd(
        [join(BKE_VENV_DIR, "bin", "python"), "-m", "pip", "install", "-v", "-r", "requirements.txt"],
        cwd=BKE_DIR,
        env=dict(environ, VIRTUAL_ENV=BKE_VENV_DIR),
    )

    if exists(BKE_VENV_DIR):
        print("## Link venv to project root")
        symlink(BKE_VENV_DIR, ROOT_VENV_DIR, target_is_directory=True)

    print("# Init frontend")
    print("## Installing NPM dependencies")
    run_cmd(["npm", "install"], cwd=FTE_DIR)

    print("# Initial update of data schemas")
    update_json_schemas()


def update_json_schemas():
    # Python
    print("## Updating Python data schemas")
    run_cmd(
        [
            join(BKE_VENV_DIR, "bin", "datamodel-codegen"),
            "--input",
            DATA_SCHEMA_DIR,
            "--input-file-type",
            "jsonschema",
            "--output",
            join(BKE_DIR, "schema_gen"),
            "--output-model-type",
            "pydantic_v2.BaseModel",
        ],
        cwd=BKE_DIR,
        env=dict(environ, VIRTUAL_ENV=BKE_VENV_DIR, PATH=join(BKE_VENV_DIR, "bin") + ":" + environ["PATH"]),
    )

    print("## Updating TypeScript data schemas for frontend")
    run_cmd(
        [
            "npx",
            "json2ts",
            "-i",
            DATA_SCHEMA_DIR,
            "-o",
            join(FTE_DIR, "schema-gen"),
            "--cwd",
            DATA_SCHEMA_DIR,
            "--enableConstEnums",
            "true",
        ],
        cwd=FTE_DIR,
    )


def deploy_android():
    print("# Building frontend")
    run_cmd(["npm", "run", "debug-build"], cwd=FTE_DIR)

    print("# Syncing Android code")
    run_cmd(["npx", "cap", "sync"], cwd=FTE_DIR)

    print("# Generating APK")
    run_cmd(["npx", "cap", "build", "android"], cwd=FTE_DIR)


### Util ###


def run_cmd(cmd, check=True, **kwargs):
    print(">> Running:", *cmd)
    ps = run(cmd, stdout=sys.stdout, stderr=sys.stderr, **kwargs)
    if ps.returncode != 0:
        print("Command returned non-zero exit status", ps.returncode)
        if check:
            print("Error!")
            sys.exit(-2)


#########################################################################

ACTIONS = {
    "init": init,
    "update-data": update_json_schemas,
    "deploy-android": deploy_android,
}

if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(description="Script to handle development tasks in the project.")
    arg_parser.add_argument("-v", "--verbose", action="store_true", help="increase output verbosity")
    arg_parser.add_argument("actions", nargs="+", choices=ACTIONS.keys(), help="the action(s) to perform")

    global args
    args = arg_parser.parse_args()

    try:
        for a in set(args.actions):
            ACTIONS[a]()
    except KeyboardInterrupt:
        sys.exit(0)
