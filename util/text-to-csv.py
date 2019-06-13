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
    features = ["Type", "Zone", "When it Blooms", "Where to Grow",
                "Soil Type", "When to Divide", "Habit", "Scent",
                "Attracts", "Resist", "Maturity Rate", "Long Lived",
                "Something Special or Unique"]

    csvf = open(csv_file, 'w') if csv_file else sys.stdout
    ahrf = open(ahref_file, 'w') if ahref_file else sys.stdout

    for input_file in input_files:
        if verbose:
            print("\nProcessing " + input_file)
        specs = {}
        img_names = []
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
                if len(record) > 1:
                    feature = record[0]
                    if not feature in features:
                        sys.stderr.write('Skipping unrecognized feature %s\n' % feature)
                    else:
                        specs[feature] = record[1].strip()
                    continue

                # Only one entry: missing detail for feature or image name
                if features[-1] in specs:
                    # Extra info after the last feature; assume image name
                    # Check if the text starts as does sci_name (only checking
                    # the first word for cases like "Sedum varieties")
                    contains_sci_name = record[0].split()[0] == sci_name.split()[0]
                    img_name = (record[0] if contains_sci_name
                                else sci_name + " '" + record[0] + "'")
                    img_names.append(img_name)
                    if verbose:
                        print('Treating "%s" as image info' % record[0])
                        if img_name != record[0]:
                            print('Full image name: "%s"' % img_name)
                else:
                    sys.stderr.write('Missing detail for feature %s\n' % record[0])
                    specs[record[0]] = ''

        details = [specs.get(f, '') for f in features]
        csvf.write('|'.join(details) + '|' + ':'.join(img_names) + '\n')

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

    if args.verbose:
        print("Running with settings: %s...\n" % args)

    process_input_files(args.files, args.csv, args.ahref, args.verbose)

if __name__ == "__main__":
    sys.exit(main())
