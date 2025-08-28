#!/usr/bin/env python


"""
Panflute filter to convert internal org-mode-style links to Hugo 'relref' shortcodes.

Correctly identifies that Pandoc parses certain internal org-mode
links as `Span` elements with the class 'spurious-link', and targets them
for replacement.

pandoc content-org/all-posts.org --from org --to org --filter ./scripts/convert_filter.py -o all-posts-converted.org
"""

import panflute as pf


def prepare(doc):
    """
    Builds the slug map by cleaning header text of both keywords and tags.
    """

    doc.slug_map = {}

    ORG_KEYWORDS = ["DONE", "TODO", "DRAFT"]

    def build_map(elem, doc):
        if isinstance(elem, pf.Header) and "export_file_name" in elem.attributes:
            full_title = pf.stringify(elem).strip()

            slug = elem.attributes["export_file_name"]

            # Strip trailing tags (e.g., "@personal @workflow")

            title_no_tags = full_title.split(" @")[0].strip()

            # Strip leading keyword (e.g., "DONE")

            parts = title_no_tags.split(maxsplit=1)

            if len(parts) > 1 and parts[0] in ORG_KEYWORDS:
                title_key = parts[1].strip()

            else:
                title_key = title_no_tags

            doc.slug_map[title_key] = slug

    doc.walk(build_map)


def action(elem, doc):
    """
    Replaces spurious-link Span elements with the correct relref shortcode.
    """

    if isinstance(elem, pf.Span) and "spurious-link" in elem.classes:
        link_target = elem.attributes.get("target", "").strip()
        if link_target in doc.slug_map:
            link_text = pf.stringify(elem)
            slug = doc.slug_map[link_target]
            hugo_shortcode = "{{{relref(" + link_text + "," + slug + ")}}}"
            return pf.RawInline(hugo_shortcode, format="org")
    return None


def finalize(doc):
    """
    Clean up the slug_map from the doc object after the filter has run.
    """

    if hasattr(doc, "slug_map"):
        del doc.slug_map


def main(doc=None):
    """
    Main function to run the filter.
    """

    return pf.run_filter(action, prepare=prepare, finalize=finalize, doc=doc)


if __name__ == "__main__":
    main()
