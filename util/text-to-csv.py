#!/usr/local/bin/python3
"""Provide example module docstring.

   See the following for more info:
   https://www.python.org/dev/peps/pep-0257/
   https://blog.dolphm.com/pep257-good-python-docstrings-by-example/

   This serves as a long usage message.

"""

import argparse
import re
import os
import sys
from bs4 import BeautifulSoup

def readable_file(file):
    if not os.path.isfile(file):
        raise argparse.ArgumentTypeError(
            "readable_file:{0} is not a valid path".format(file))
    if not os.access(file, os.R_OK):
        raise argparse.ArgumentTypeError(
            "readable_file:{0} is not a readable file".format(file))
    return file

def plant_names(full_name):
    names = re.split('[()]', full_name)
    scientific_name = ' '.join(names[0].split())
    # Create a simple id: lowercase chars; drop details
    # starting with ';', if any; replace spaces with dashes, and
    # remove all other non-alpha characters
    plant_id = scientific_name.lower().split(';', 1)[0]
    plant_id = re.sub('[^a-z ]+', '', plant_id)
    plant_id = plant_id.replace(' ', '-')

    if len(names) == 3:
        common_name = ' '.join(names[1].split())
    else:
        sys.stderr.write('Unexpected full name shape: %s\n' % full_name)
        common_name = ''

    return (scientific_name, common_name, plant_id)

def process_input_files(input_files, csv_file, ahref_file, verbose=False):
    csvf = open(csv_file, 'w') if csv_file else sys.stdout
    ahrf = open(ahref_file, 'w') if ahref_file else sys.stdout

    for input_file in input_files:
        if verbose:
            print("Processing " + input_file)
        details = []
        with open(input_file) as f:
            lines = f.readlines()
            lines = [x.strip() for x in lines]

            (sci_name, com_name, pid) = plant_names(lines[0])
            cname = f' ({com_name})' if com_name else ''
            ahref = (f'      <li><a href="plant-details.html?name={pid}">'
                     f'{sci_name}{cname}</a></li>')
            ahrf.write(ahref + '\n')

            csvf.write(sci_name + '|' + com_name + '|')
            for line in lines[1:]:
                if not line.strip(): continue
                record = line.split(': ', 1)
                details.append(record[1] if len(record) > 1 else '')
                if record[0] == "Attracts":
                    details.append('')  # An extra entry for "Resists"
        csvf.write('|'.join(details) + '|\n')

    if csv_file: csvf.close()
    if ahref_file: ahrf.close()

def main(argv=None):
    if argv is None:
        argv = sys.argv
    # Parse command line options
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="print verbose diagnostics")
    parser.add_argument("-f", "--files", nargs='+', type=readable_file,
                        help="(html or text) files to parse", required=True)
    parser.add_argument("-c", "--csv", type=str,
                        help="csv output file (default: stdout)")
    parser.add_argument("-a", "--ahref", type=str,
                        help="output file for html links (default: stdout)")
    args = parser.parse_args()

    print("Running with settings: %s...\n" % args)

    process_input_files(args.files, args.csv, args.ahref, args.verbose)

if __name__ == "__main__":
    sys.exit(main())
