#!/usr/bin/env python3

# --- exit codes ---
# 0: sucess
# 1: error
# 2: command not allowed

import argparse
import json
import os
from sys import stdout, stderr
import shutil
from subprocess import Popen, PIPE, STDOUT

from jsonschema.exceptions import UnknownType
from jinja2 import Environment, FileSystemLoader
from git import Repo
from jsonschema import validate
from time import sleep
from helper import is_git_repo
from pathlib import Path

# --- parsing ---
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a flake and publish it to an iglu-cache")
    # Default params
    parser.add_argument("--dir", type=str, default="/tmp/repos", help="The directory in witch the repo should be cloned into")

    # Git params
    parser.add_argument("--no-clone", action="store_true", help="Don't clone any repository")
    parser.add_argument("--repository", type=str, help="The repository to clone")
    parser.add_argument("--branch", type=str, help="The repositorys branch to clone")
    parser.add_argument("--git-user", type=str, help="The username to clone the repositorys")
    parser.add_argument("--git-key", type=str, help="The key to clone the repositorys")

    # Bild params
    parser.add_argument("--command", type=str, help="The repository to clone")

    # Cachix params
    parser.add_argument("--no-push", action="store_true", help="Don't push any result")
    parser.add_argument("--target", type=str, help="URL of the cache with cache (https://caches.iglu.sh/default)")
    parser.add_argument("--api-key", type=str, help="Authtoken for the cache")
    parser.add_argument("--signing-key", type=str, help="key witch is used to sign the derivations")

    # Substituter params
    parser.add_argument("--substituter", action="append", type=str, help="A substituter which is used during the build process")
    parser.add_argument("--trusted-key", action="append", type=str, help="A trusted public key of a substituter")

    # JSON
    parser.add_argument("--json", type=str, help="Input all settings via JSON")

    args = parser.parse_args()

    # Check args
    if args.json is None:
        if not args.no_clone and args.repository is None:
            parser.error("--repository is required if --no-clone is not set.")
        if not args.no_push:
            if args.target is None:
                parser.error("--target is required if --no-push is not set.")
            if args.api_key is None:
                parser.error("--api-key is required if --no-push is not set.")
            if args.signing_key is None:
                parser.error("--signing-key is required if --no-push is not set.")
        if args.command is None:
            parser.error("--command is needed")
        if (args.substituter is None) != (args.trusted_key is None):
            parser.error("--substituter and --trusted-key have to be set or unset together")
        elif not args.substituter is None and not args.trusted_key is None and len(args.substituter) != len(args.trusted_key):
            parser.error("--substituter and --trusted-key must set equaly often")


    # Check if other args given if json is set
    invalid_args = [k for k, v in vars(args).items() if k not in ["json", "dir"] and v not in (None, False)]
    if args.json and len(invalid_args) > 1:
        stderr.write(str(invalid_args))
        parser.error("You can not set more params if --json is set.")

    # Parse args to right type
    args.dir = Path(args.dir)

    return args


def parse_json_config(args: argparse.Namespace, json_str: str) -> argparse.Namespace:
    path = os.path.split(os.path.abspath(__file__))[0]

    try:                                   
        with open(path + '/../schemas/bodySchema.json') as f:
            jsonSchema = json.load(f)
    except Exception as e:
        stderr.write(str(e))                               
        exit(1)

    try:
        raw = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")

    validate(instance=raw, schema=jsonSchema)
    
    # Basic structure validation
    if "git_config" not in raw or "build_options" not in raw or "cachix_config" not in raw:
        raise ValueError("JSON must contain 'git_config', 'cachix_config' and 'build_options' keys")

    raw.setdefault("git_config", {})
    raw.setdefault("build_options", {"substituters": []})
    raw.setdefault("cachix_config", {})

    args.branch = raw["git_config"].setdefault("branch", None)
    args.git_user = raw["git_config"].setdefault("gitusername", None)
    args.git_key = raw["git_config"].setdefault("gitkey", None)
    args.no_clone = raw["git_config"].setdefault("noclone", None)
    args.command = raw["build_options"].setdefault("command", None)
    args.no_push = not raw["cachix_config"].setdefault("push", True)
    args.api_key = raw["cachix_config"].setdefault("apikey", None)
    args.signing_key = raw["cachix_config"].setdefault("signingkey", None)
    args.target = raw["cachix_config"].setdefault("target", None)
    args.repository = raw["git_config"].setdefault("repository", None)

    if len(raw["build_options"]["substituters"]) > 0:
        substituters = []
        trusted_keys = []

        for sub in raw["build_options"]["substituters"]:
            substituters.append(sub["url"])

            for key in sub["public_signing_keys"]:
                trusted_keys.append(key)

        args.substituter = substituters
        args.trusted_key = trusted_keys
    else:
        args.substituter = None 
        args.trusted_key = None 


    return args

# --- Core ---
def clone(args: argparse.Namespace) -> None:
    # Set Repo url
    if not args.git_user is None and not args.git_key is None:
        repo = args.repository.replace("://", "://" + args.git_user + ":" + args.git_key + "@")
    else:
        repo = args.repository

    stdout.write("Checking if the repository is already pulled ...\n")
    pulled = False
    # Check if repo direcotry already exists
    print(args.dir)
    if os.path.exists(args.dir) and is_git_repo(args.dir):
        remote_url= list(Repo(args.dir).remotes["origin"].urls)[0]

        # Pull Repo if remote is correct and delete it if not
        if remote_url == repo:
            stdout.write("Repository found! Pulling it...\n")
            Repo(args.dir).remotes['origin'].pull()
            pulled = True
        else:
            shutil.rmtree(args.dir)
    else:
        shutil.rmtree(args.dir)

    # Clone Repo if not pulled
    if not pulled:
        stdout.write(f"Repository not found! Cloning it...\n")
        stdout.write(f"Cloning repo: {repo}...\n")
        try:
            Repo.clone_from(repo, args.dir)
        except Exception as e:
            stderr.write(str(e))
            exit(1)

def build(args: argparse.Namespace) -> None:
    # Check if command start with nix or nix-build
    if args.command.split(" ")[0] in ["nix", "nix-build"]:
        cachix_option: list[str]
        if not args.no_push:
            # Set cachix options
            prepare_cachix(args)
            cachix_option = ["cachix", "-c", "./cachix.dhall", "watch-exec", args.target.split("/")[-1], "--"]
        else:
            cachix_option = []
        # Set substituter option
        substituter_option = []
        if not args.substituter is None:
            substituter_option = [
                "--option",
                "extra-trusted-public-keys",
                " ".join(args.trusted_key),
                "--option",
                "extra-substituters",
                " ".join(args.substituter)
            ]
        stdout.write(f"Start building...\n")
        child = Popen(
            cachix_option + args.command.split(" ") + substituter_option,
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
            bufsize=1,
            cwd=args.dir
        )

        if not child.stdout is None:
            for line in child.stdout:
                stdout.write(line) 

        child.wait()

        if(child.returncode != 0):
            exit(1)
        stdout.write(f"Build finished!\n")
    else:
        stderr.write("Invalid command! Command must start with \"nix\" or \"nix-build\"\n")
        exit(2)

def prepare_cachix(args: argparse.Namespace) -> None:
    env = Environment(loader=FileSystemLoader(os.path.dirname(os.path.abspath(__file__))))
    template = env.get_template("cachix.dhall.j2")
    data = {
        "authToken": args.api_key,
        "hostname": "/".join(args.target.split("/")[0:-1]) + "/",
        "binaryCache": args.target.split("/")[-1],
        "secretKey": args.signing_key
    }

    cachix_config = template.render(data)
    with open(os.path.join(args.dir, "cachix.dhall"), "w") as f:
        f.write(cachix_config)

# --- Main ---
def main() -> None:
    args = parse_args()
    
    if args.json != None:
        args = parse_json_config(args, args.json)

    if not os.path.exists(args.dir):
        os.makedirs(args.dir)

    if not args.no_clone:
        clone(args)

    build(args)

main()
