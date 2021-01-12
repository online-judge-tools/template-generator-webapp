#!/usr/bin/env python3
import argparse
import json
import pathlib
import random
import subprocess
import sys
import tempfile
from logging import DEBUG, INFO, basicConfig, getLogger
from typing import *

import requests

logger = getLogger(__name__)


class Problem(NamedTuple):
    url: str
    title: str


def list_atcoder_problems() -> List[Problem]:
    resp = requests.get('https://kenkoooo.com/atcoder/resources/problems.json')
    resp.raise_for_status()
    data = json.loads(resp.content)
    problems = []
    for row in data:
        url = 'https://atcoder.jp/contests/{}/tasks/{}'.format(row['contest_id'], row['id'])
        problems.append(Problem(url=url, title=row['title']))
    random.shuffle(problems)
    return problems


def generate(url: str) -> Dict[str, str]:
    templates = [
        'main.cpp',
        'main.py',
        'generate.cpp',
        'generate.py',
    ]

    with tempfile.TemporaryDirectory() as tempdir_:
        tempdir = pathlib.Path(tempdir_)

        # TODO: Make this robust. This implementation highly depends oj-prepare.
        config_toml = tempdir / 'config.toml'
        with open(config_toml, 'w') as fh:
            print('[templates]', file=fh)
            for template in templates:
                print('"{}" = "{}"'.format(template, template), file=fh)

        subprocess.run(['oj-prepare', '--config-file', str(config_toml), url], cwd=tempdir)

        result = {}
        for template in templates:
            with open(tempdir / template) as fh:
                result[template] = fh.read()
        return result


def update(problems: Dict[str, Dict[str, Any]]) -> None:
    for problem in list_atcoder_problems():
        try:
            template = generate(problem.url)
        except Exception:
            logger.exception('failed for problem: %s', problem.url)
            template = {}
        problems[problem.url] = {
            'url': problem.url,
            'title': problem.title,
            'template': template,
        }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', default='data.json')
    parser.add_argument('-v', '--verbose', action='store_true')
    args = parser.parse_args()

    # config the global logger
    level = INFO
    if args.verbose:
        level = DEBUG
    basicConfig(level=level)

    problems = {}
    path = pathlib.Path(args.file)
    if path.exists():
        with open(path) as fh:
            try:
                data = json.load(fh)
            except ValueError:
                logger.exception('data is broken')
                return 1
            else:
                problems = {problem['url']: problem for problem in data}
    try:
        update(problems)
    finally:
        with open(path, 'w') as fh:
            json.dump(list(problems.values()), fh)
    return 0


if __name__ == '__main__':
    sys.exit(main())
