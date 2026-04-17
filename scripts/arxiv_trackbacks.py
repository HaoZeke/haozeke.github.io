#!/usr/bin/env python3

# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "beautifulsoup4==4.12.3",
#   "click==8.1.8",
#   "requests==2.32.3",
#   "rich==14.0.0",
# ]
# ///

"""Send arXiv trackbacks for posts that link to arXiv papers.

Background -- the arXiv trackback protocol, distilled
=====================================================

arXiv's trackback receiver is the legacy MovableType-style trackback ping. This
is the only supported wire format for *submitting* trackbacks. The Open
Annotation / Turtle (RDF) format described on
https://info.arxiv.org/help/trackback.html is the *download* format for
already-accepted trackbacks (see export.arxiv.org/data/trackbacks/), not a
submission format. Verified by reading the arxiv-browse open-source code:

  arXiv/arxiv-browse/browse/routes/ui.py:226-230
      @blueprint.route("trackback/<path:arxiv_id>", methods=["GET", "POST"])
      def trackback(arxiv_id): raise InternalServerError("Not Yet Implemented")

  -- the public Flask code is a stub; production runs the older closed-source
  Perl trackback receiver at the same path. arXiv's own discovery template
  (arXiv/arxiv-browse/browse/templates/abs/trackback_rdf.html) advertises
  xmlns:trackback="http://madskills.com/public/xml/rss/module/trackback/",
  which is the MovableType trackback module namespace.

Wire format
-----------
POST https://arxiv.org/trackback/<arxiv_id>
    Content-Type: application/x-www-form-urlencoded

    title=<post-title>&url=<post-url>&blog_name=<our-blog>&excerpt=<short-excerpt>

Success response (per MovableType spec, confirmed by antieau's working
implementation at antieau/antieau.github.io _scripts/send_trackbacks.py):

    <?xml version="1.0" encoding="utf-8"?>
    <response><error>0</error></response>

Error response:

    <response><error>1</error><message>...</message></response>

CRITICAL: The previous implementation here treated "no <error>1</error>" as
success, which logs empty bodies and HTML pages as "sent" -- a silent failure
that poisons the dedup log. We require explicit <error>0</error> now.

Editorial queue
---------------
A successful POST does NOT mean the trackback is published. arxiv-base's DB
schema (arXiv/arxiv-base/arxiv/db/arxiv-db-metadata.yaml) shows the actual
state machine:

    arXiv_trackback_pings.status:  pending | pending2 | accepted | rejected | spam
    arXiv_trackback_sites.action:  neutral | accept | reject | spam

New blogs default to `neutral` and trackbacks land in `pending`. arxiv has a
manual editorial review for unknown sources to keep out spam. To verify a
specific paper's trackback page, GET https://arxiv.org/tb/<arxiv_id>; only
trackbacks with status=accepted are listed there. Sub-pages of the form
https://export.arxiv.org/data/trackbacks/trackback_<arxiv_id>.ttl are the
RDF/Turtle download mirror of the same accepted set.

If a trackback is stuck in pending forever, the blog identity (here:
"RG Musings") may need to be promoted from neutral->accept by emailing
help@arxiv.org. Until then, expect post-acceptance verification to 404.

Coverage
--------
This script scans rendered HTML in `public/` for <a href="...arxiv.org/abs/X">
anchor tags. It does NOT scan bib files or resolve org-cite/citeproc citations
to arxiv eprints; in this site's current setup almost no posts use [cite:@key]
syntax (only content-org/solutions/SR2/sol03.Rorg, 4 cite calls). If usage of
bibliography citations grows, add a bib parser + per-post key resolver here.
For citations to render as clickable arxiv links in HTML, the CSL style at
content-org/biblio/csl/ieee.csl must emit <text variable="URL"/> -- the
upstream `ieee-with-url.csl` variant does this; plain `ieee.csl` does not.

State files
-----------
.sent_trackbacks.log         -- (post_url|paper_id) pairs confirmed by an
                                explicit <error>0</error> response. Treated as
                                authoritative dedup state; never re-sent.
.unverified_trackbacks.log   -- (post_url|paper_id|http_status|body_excerpt)
                                rows for POSTs that returned anything other
                                than <error>0</error>. Inspect manually; rows
                                here are retried on the next run.
"""

import logging
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import click
import requests
from bs4 import BeautifulSoup
from rich.logging import RichHandler

BLOG_NAME = "RG Musings"

# Match both new-style (YYMM.NNNNN) and old-style (subject-class/YYMMNNN)
# arXiv IDs. The optional vN suffix is captured separately so we can strip it.
ARXIV_PATTERN = re.compile(
    r"arxiv\.org/(?:abs|pdf)/"
    r"(?P<id>"
    r"\d{4}\.\d{4,5}"             # new style: 2007.06090
    r"|"
    r"[a-z\-]+(?:\.[A-Z]{2})?/\d{7}"  # old style: gr-qc/9712019, hep-th/0501234
    r")"
    r"(?:v\d+)?",                 # optional version suffix, dropped
    re.IGNORECASE,
)

VERIFY_TTL_URL = "https://export.arxiv.org/data/trackbacks/trackback_{paper_id}.ttl"


def load_log(log_file: Path) -> set[str]:
    """Load the set of `post_url|paper_id` keys already in a log file."""
    if not log_file.exists():
        return set()
    with log_file.open("r", encoding="utf-8") as f:
        return {line.split("|", 2)[0] + "|" + line.split("|", 2)[1]
                for line in (l.strip() for l in f) if line and "|" in line}


def append_log(log_file: Path, line: str) -> None:
    with log_file.open("a", encoding="utf-8") as f:
        f.write(line.rstrip("\n") + "\n")


def send_trackback(
    paper_id: str,
    post_url: str,
    post_title: str,
    post_excerpt: str,
    site_url: str,
) -> tuple[bool, int, str]:
    """POST a MovableType trackback to arXiv.

    Returns (verified_success, http_status, short_body_excerpt).
    `verified_success` is True only when the body literally contains
    <error>0</error>. Anything else -- empty body, HTML, <error>1</error> -- is
    a non-success and the caller should keep the row out of the dedup log.
    """
    trackback_url = f"https://arxiv.org/trackback/{paper_id}"
    payload = {
        "title": post_title,
        "url": post_url,
        "blog_name": BLOG_NAME,
        "excerpt": post_excerpt,
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent": f"haozeke-trackback-bot/2.0 (+{site_url})",
        # Referer mirrors what CosmoCoffee (a long-running accepted sender)
        # passes; some MT trackback receivers spam-filter on missing Referer.
        "Referer": site_url,
    }
    try:
        logging.info(
            f"POST trackback paper=[bold cyan]{paper_id}[/] from "
            f"[link={post_url}]{post_url}[/link]"
        )
        response = requests.post(
            trackback_url, data=payload, headers=headers, timeout=15
        )
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error for {paper_id}: {e}")
        return False, 0, f"network-error: {e}"

    body = response.text or ""
    excerpt = re.sub(r"\s+", " ", body)[:200]

    if response.status_code >= 400:
        logging.warning(
            f"HTTP {response.status_code} for {paper_id}: {excerpt!r}"
        )
        return False, response.status_code, excerpt

    if "<error>0</error>" in body:
        logging.info(f"  [green]accepted[/] by arXiv: {paper_id}")
        return True, response.status_code, excerpt

    msg_match = re.search(r"<message>(.*?)</message>", body, re.DOTALL)
    msg = msg_match.group(1).strip() if msg_match else excerpt or "(empty body)"
    logging.warning(
        f"  [yellow]not-accepted[/] by arXiv ({response.status_code}): {msg}"
    )
    return False, response.status_code, excerpt


def verify_accepted(paper_id: str, timeout: int = 10) -> bool | None:
    """HEAD the public trackback export to see if arXiv has accepted any
    trackback for this paper. Returns True (something exists), False (404), or
    None (network error / inconclusive).
    """
    url = VERIFY_TTL_URL.format(paper_id=paper_id)
    try:
        r = requests.head(url, allow_redirects=True, timeout=timeout)
    except requests.exceptions.RequestException as e:
        logging.debug(f"verify HEAD {url} failed: {e}")
        return None
    if r.status_code == 200:
        return True
    if r.status_code == 404:
        return False
    return None


@click.command()
@click.option(
    "--site-url",
    required=True,
    help="The full base URL of the site (e.g., https://rgoswami.me).",
)
@click.option(
    "--public-dir",
    default="public",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    help="Path to the directory containing the built site.",
)
@click.option(
    "--log-file",
    default=".sent_trackbacks.log",
    type=click.Path(dir_okay=False, writable=True, path_type=Path),
    help="Path to the dedup log of confirmed-accepted (error=0) trackbacks.",
)
@click.option(
    "--unverified-log",
    default=".unverified_trackbacks.log",
    type=click.Path(dir_okay=False, writable=True, path_type=Path),
    help="Path to the log of POSTs that did NOT return <error>0</error>.",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Discover (post, paper) pairs and report, but do not POST anything.",
)
@click.option(
    "--verify",
    is_flag=True,
    help="After sending, HEAD export.arxiv.org for each paper in the dedup "
    "log and report how many are publicly visible vs. still-pending.",
)
@click.option(
    "-v", "--verbose", is_flag=True, help="Enable DEBUG level logging."
)
def main(
    site_url: str,
    public_dir: Path,
    log_file: Path,
    unverified_log: Path,
    dry_run: bool,
    verify: bool,
    verbose: bool,
):
    """Scan a built static site for arXiv links and send trackbacks for new
    mentions.

    Only POSTs that return an explicit <error>0</error> body are recorded in
    the dedup log; everything else lands in --unverified-log for later inspection
    and will be retried on the next run.
    """
    log_level = "DEBUG" if verbose else "INFO"
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, markup=True)],
    )

    assert site_url.startswith(("http://", "https://")), (
        "site_url must be a valid http/https URL."
    )

    sent = load_log(log_file)
    logging.info(
        f"Loaded {len(sent)} previously-confirmed trackbacks from {log_file}."
    )

    new_sent = 0
    new_unverified = 0
    skipped_seen = 0

    logging.info(f"Scanning HTML files in [green]{public_dir}[/]...")
    html_files = list(public_dir.glob("**/*.html"))
    if not html_files:
        logging.warning(f"No HTML files found in '{public_dir}'. Exiting.")
        sys.exit(0)
    logging.info(f"Found {len(html_files)} HTML files.")

    for html_file in html_files:
        with html_file.open("r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

        links = soup.find_all("a", href=True)
        if not links:
            continue

        relative_path = html_file.relative_to(public_dir).as_posix()
        post_url = urljoin(site_url, relative_path)
        post_title = (
            soup.title.string.strip()
            if soup.title and soup.title.string
            else "Untitled Page"
        )
        meta_desc = soup.find("meta", attrs={"name": "description"})
        post_excerpt = (
            meta_desc["content"]
            if meta_desc and meta_desc.get("content")
            else (soup.p.get_text() if soup.p else "...")
        )
        if len(post_excerpt) > 253:
            post_excerpt = post_excerpt[:250] + "..."

        seen_in_this_post: set[str] = set()
        for link in links:
            match = ARXIV_PATTERN.search(link["href"])
            if not match:
                continue
            paper_id = match.group("id")
            if paper_id in seen_in_this_post:
                continue
            seen_in_this_post.add(paper_id)

            key = f"{post_url}|{paper_id}"
            if key in sent:
                skipped_seen += 1
                logging.debug(f"Already accepted: {key}")
                continue

            if dry_run:
                logging.info(f"[dry-run] would POST {paper_id} from {post_url}")
                new_sent += 1
                continue

            ok, status, excerpt = send_trackback(
                paper_id, post_url, post_title, post_excerpt, site_url
            )
            if ok:
                append_log(log_file, key)
                sent.add(key)
                new_sent += 1
            else:
                append_log(
                    unverified_log,
                    f"{post_url}|{paper_id}|{status}|{excerpt}",
                )
                new_unverified += 1

    logging.info(
        f"[bold green]Done.[/] dedup-skipped=[cyan]{skipped_seen}[/] "
        f"newly-accepted=[green]{new_sent}[/] "
        f"unverified=[yellow]{new_unverified}[/]"
    )

    if verify and not dry_run:
        logging.info(
            f"Verifying {len(sent)} dedup-log entries against export.arxiv.org..."
        )
        unique_papers = sorted({k.split("|", 1)[1] for k in sent})
        visible = 0
        missing = 0
        inconclusive = 0
        for pid in unique_papers:
            r = verify_accepted(pid)
            if r is True:
                visible += 1
            elif r is False:
                missing += 1
            else:
                inconclusive += 1
        logging.info(
            f"verify: visible=[green]{visible}[/] "
            f"missing(404)=[yellow]{missing}[/] "
            f"inconclusive=[red]{inconclusive}[/]  "
            f"(missing>0 over many days suggests editorial-queue stuck; "
            f"consider emailing help@arxiv.org to whitelist {BLOG_NAME!r})"
        )


if __name__ == "__main__":
    main()
