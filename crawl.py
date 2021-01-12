#!/usr/bin/env python3
import argparse
import glob
import json
import pathlib
import random
import subprocess
import sys
import tempfile
from logging import DEBUG, INFO, basicConfig, getLogger
from typing import *

import requests
import toml

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
        problems.append(Problem(
            url=url,
            title=row['title'],
        ))
    return problems


def list_codeforces_problems() -> List[Problem]:
    resp = requests.get('https://codeforces.com/api/problemset.problems')
    resp.raise_for_status()
    data = json.loads(resp.content)
    assert data['status'] == 'OK'

    problems = []
    for row in data['result']['problems']:
        url = 'https://codeforces.com/contest/{}/problem/{}'.format(row['contestId'], row['index'])
        problems.append(Problem(
            url=url,
            title=row['name'],
        ))
    return problems


def list_library_checker_problems() -> List[Problem]:
    with tempfile.TemporaryDirectory() as tempdir_:
        tempdir = pathlib.Path(tempdir_)
        subprocess.check_call(['git', 'clone', '--depth=1', 'https://github.com/yosupo06/library-checker-problems', str(tempdir)])

        problems = []
        for info_toml in tempdir.glob('**/info.toml'):
            if tempdir / 'test' in info_toml.parents:
                continue
            problem_id = info_toml.parent.name
            url = 'https://judge.yosupo.jp/problem/{}'.format(problem_id)
            with open(info_toml) as fh:
                info = toml.load(fh)
            problems.append(Problem(
                url=url,
                title=info['title'],
            ))
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

        subprocess.check_call(['oj-prepare', '--config-file', str(config_toml), url], cwd=tempdir)

        result = {}
        for template in templates:
            with open(tempdir / template) as fh:
                result[template] = fh.read()
        return result


def update(generated: Dict[str, Dict[str, Any]]) -> None:
    problems: List[Problem] = []
    problems += list_atcoder_problems()
    problems += list_codeforces_problems()
    problems += list_library_checker_problems()
    random.shuffle(problems)

    for problem in problems:
        if problem.url in generated and random.random() < 0.95:
            continue
        try:
            template = generate(problem.url)
        except Exception:
            logger.exception('failed for problem: %s', problem.url)
            template = {}
        generated[problem.url] = {
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

    generated = {}
    path = pathlib.Path(args.file)
    if path.exists():
        with open(path) as fh:
            try:
                data = json.load(fh)
            except ValueError:
                logger.exception('data is broken')
                return 1
            else:
                generated = {problem['url']: problem for problem in data}
    try:
        update(generated)
    finally:
        with open(path, 'w') as fh:
            json.dump(list(generated.values()), fh)
    return 0


if __name__ == '__main__':
    sys.exit(main())
