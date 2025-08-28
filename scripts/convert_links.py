#!/usr/bin/env python3
import re
import sys
import os
import panflute as pf
import io
import subprocess

"""
Standalone script to convert internal org-mode links to Hugo 'relref' shortcodes.

This script uses a hybrid approach:
1.  It calls Pandoc as a subprocess to reliably parse the source file into a
    JSON Abstract Syntax Tree (AST).
2.  It uses Panflute to load this JSON AST and build a map of slugs. The matching
    is now CASE-INSENSITIVE.
3.  It then uses a regular expression to perform a precise, case-insensitive
    search-and-replace on the original raw text.
"""


def build_slug_map_with_panflute(input_path):
    """
    Uses Pandoc + Panflute to robustly parse the document and build the slug map.
    """
    ORG_KEYWORDS = ["DONE", "TODO", "DRAFT"]

    def build_map_action(elem, doc):
        if isinstance(elem, pf.Header) and "export_file_name" in elem.attributes:
            full_title = pf.stringify(elem).strip()
            slug = elem.attributes["export_file_name"]
            title_no_tags = full_title.split(" @")[0].strip()
            parts = title_no_tags.split(maxsplit=1)
            if len(parts) > 1 and parts[0] in ORG_KEYWORDS:
                title_key = parts[1].strip()
            else:
                title_key = title_no_tags
            doc.slug_map[title_key.lower()] = slug

    try:
        print("--> [Stage 1a: Pandoc] Parsing org-mode file to JSON...")
        command = ["pandoc", "--from", "org", "--to", "json", input_path]
        result = subprocess.run(
            command, capture_output=True, text=True, check=True, encoding="utf-8"
        )
        pandoc_json_output = result.stdout

        print("--> [Stage 1b: Panflute] Loading JSON AST...")
        with io.StringIO(pandoc_json_output) as f:
            doc = pf.load(f)

        print("--> [Stage 1c: Panflute] Building slug map from AST...")
        doc.slug_map = {}
        doc.walk(build_map_action)

        print(f"--> [Panflute] Built map with {len(doc.slug_map)} entries.")
        return doc.slug_map

    except FileNotFoundError:
        print("\nError: 'pandoc' command not found.")
        print("Please ensure Pandoc is installed and in your system's PATH.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print("\nError: Pandoc failed to parse the input file.")
        print(f"Pandoc's error output (stderr):\n{e.stderr}")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn unexpected error occurred during the Panflute stage: {e}")
        sys.exit(1)


def replace_links_with_regex(text, slug_map):
    """
    STAGE 2: Use regex to safely edit the raw text.
    """
    link_regex = re.compile(
        r"\[\[(?!https?://|file:|fig:|tbl:|#)([^\]]+?)\]\[([^\]]+?)\]\]"
    )
    replacements_made = 0

    def replacer(match):
        nonlocal replacements_made
        link_target = match.group(1).strip()
        link_desc = match.group(2).strip()

        link_target_lower = link_target.lower()
        if link_target_lower in slug_map:
            slug = slug_map[link_target_lower]
            replacements_made += 1
            return "{{{relref(" + link_desc + "," + slug + ")}}}"
        else:
            return match.group(0)

    new_text = link_regex.sub(replacer, text)
    print(f"--> [Stage 2: Regex] Made {replacements_made} replacements.")
    return new_text


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 convert_links.py <input_file.org> <output_file.org>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"Error: Input file not found at '{input_path}'")
        sys.exit(1)

    slug_map = build_slug_map_with_panflute(input_path)

    with open(input_path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = replace_links_with_regex(content, slug_map)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print("Done.")


if __name__ == "__main__":
    main()
