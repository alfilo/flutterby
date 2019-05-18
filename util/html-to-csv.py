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

def html_file(file):
    if not os.path.isfile(file):
        raise argparse.ArgumentTypeError(
            "html_file:{0} is not a valid path".format(file))
    if not os.access(file, os.R_OK):
        raise argparse.ArgumentTypeError(
            "html_file:{0} is not a readable file".format(file))
    return file

def table_csv(soup):
    res = []
    for tr in soup.find('tbody').find_all('tr'):
        tds = tr.find_all('td')
        # Take the second td (detail, not feature)
        detail = tds[1].get_text()

        # Replace sequences of whitespace characters (incl. newlines)
        # with a single space
        # Can use re (import re):
        #re.sub('\s+', ' ', detail).strip()
        # Simpler, including implicit strip: join of split
        res.append(' '.join(detail.split()))

    return '|'.join(res)

def names_and_id(full_name, imgf):
    names = re.split('[()]', full_name)
    common_name = ' '.join(names[0].split())
    if len(names) != 3:
        imgf.write('Unexpected full name shape: %s\n' % full_name)
        return (common_name, "", "")

    scientific_name = ' '.join(names[1].split())
    # Create a simple id: lowercase chars; drop details
    # starting with ';', if any; replace spaces with dashes, and
    # remove all other non-alpha characters
    plant_id = scientific_name.lower().split(';', 1)[0]
    plant_id = re.sub('[^a-z ]+', '', plant_id)
    plant_id = plant_id.replace(' ', '-')
    return (common_name, scientific_name, plant_id)

def plant_names_and_images(soup, imgf, ahrf):
    full_name = soup.h1.string
    non_std_img_titles = []
    (com_name, sci_name, plant_id) = names_and_id(full_name, imgf)
    ahref = (f'      <li><a href="plant-details.html?name={plant_id}">'
             f'{sci_name} ({com_name})</a></li>')
    ahrf.write(ahref + '\n')
    std_src = 'images/' + plant_id + '.jpg'
    for img in soup.find_all('img'):
        title = img.get('title')
        src = img.get('src')
        if title != com_name + ' (' + sci_name + ')':
            imgf.write('# Unexpected image title: %s\n' % title)
            (cname, sname, pid) = names_and_id(title, imgf)
            ssrc = 'images/' + pid + '.jpg'
            non_std_img_titles.append(sname)
            if src != ssrc:
                imgf.write('git mv %s %s\n' % (src, ssrc))
        elif src != std_src:
            imgf.write('git mv %s %s\n' % (src, std_src))

    return (sci_name + '|' + com_name, ':'.join(non_std_img_titles))

def process_html_files(html_files, csv_file, img_file, ahref_file, verbose=False):
    csvf = open(csv_file, 'w') if csv_file else sys.stdout
    imgf = open(img_file, 'w') if img_file else sys.stdout
    ahrf = open(ahref_file, 'w') if ahref_file else sys.stdout

    for html_file in html_files:
        if verbose:
            print("Processing " + html_file)
        hfile = open(html_file, 'r')
        soup = BeautifulSoup(hfile, 'html.parser')
        # Don't try converting index.html or plant-details.html
        if soup.table is None or soup.td is None: continue
        (plant_names, img_titles) = plant_names_and_images(soup, imgf, ahrf)
        csv_string = (plant_names + '|' + table_csv(soup) +
                      '|' + img_titles + '\n')
        csvf.write(csv_string)

    if csv_file: csvf.close()
    if img_file: imgf.close()
    if ahref_file: ahrf.close()

def main(argv=None):
    if argv is None:
        argv = sys.argv
    # Parse command line options
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="print verbose diagnostics")
    parser.add_argument("-f", "--files", nargs='+', type=html_file,
                        help="html files to parse", required=True)
    parser.add_argument("-c", "--csv", type=str,
                        help="csv output file (default: stdout)")
    parser.add_argument("-i", "--img", type=str,
                        help="img-command output file (default: stdout)")
    parser.add_argument("-a", "--ahref", type=str,
                        help="output file for html links (default: stdout)")
    args = parser.parse_args()

    print("Running with settings: %s...\n" % args)

    process_html_files(args.files, args.csv, args.img, args.ahref, args.verbose)

if __name__ == "__main__":
    sys.exit(main())
