"""Replace em dashes with punctuation that carries the same sense.

Deleting the character is not the job. Every one of these is doing grammatical
work, so what replaces it depends on what follows:

  a matched pair inside one sentence -> parentheses, so the aside keeps its edges
  a bare list                        -> colon
  a clause that can stand alone      -> full stop, and the clause is capitalised
  anything else                      -> comma

The hard call is the third one, because a comma after a clause is a splice and
a full stop before a fragment is worse. Two things decide it: whether a finite
verb belongs to the segment's own subject, and whether the segment is really a
noun phrase wearing a verb (a relative clause, reduced or not).
"""
import re

DASH = re.compile(r'[ \t]*(?:&mdash;|—)[ \t]*')
SENT_END = re.compile(r'(?<=[.!?])\s|</p>|</li>|</h\d>|</td>|</span>|\|')

# These always continue the same sentence, whatever follows them.
DEPENDENT = re.compile(r"""^(?:and|but|or|nor|so|yet|not|especially|including|because|which|
    who|whom|whose|though|although|while|whereas|since|unless|until|after|before|plus|
    even|often|usually|mostly|typically|generally|sometimes|always|never|just|only|
    from|for|with|without|about|over|under|up|down|at|by|to|in|on|of)\b""", re.I | re.X)

# A determiner is ambiguous alone: "the #1 academy in Texas" is an appositive
# and wants a comma; "the academy has said so" is a sentence and a comma would
# splice it.
DETERMINER = re.compile(r"""^(?:the|a|an|his|her|its|their|our|your|my|no|all|both|
    either|neither|most|some|each|every|another|one)\b""", re.I | re.X)

# Verbs are listed, never guessed at by shape. A "any word ending in s"
# shortcut reads "the #1 academy in Texas" and "injuries, work, a school term"
# as sentences, because Texas and injuries end in s.
_VERBS = """give make take mean come go keep stay work help start end answer show need want
    look feel know learn train teach lead run cost happen matter tell say sit hold build turn
    bring let become remain count beat win cover include prefer expect remember belong depend
    differ seem appear get put offer allow require provide use add change move open close sell
    buy pay charge focus involve produce create support follow continue stop begin finish suit
    fit rank place list name call ask reply respond arrive leave return wait watch read write
    book join bring send meet miss lose find think feel grow drop raise""".split()
_IRREG = ['carries', 'applies', 'varies', 'tries', 'studies', 'does', 'goes', 'has', 'is',
          'are', 'was', 'were', 'had', 'will', 'would', 'can', 'could', 'should', 'must',
          'may', 'might', 'cannot', "isn't", "aren't", "wasn't", "weren't", "hasn't",
          "haven't", "won't", "doesn't", "don't", "didn't", 'did', 'do', 'have']
FINITE = re.compile(r'\b(?:%s)\b' % '|'.join(
    _IRREG + [v + '(?:e?s)?' for v in _VERBS]), re.I)

SUBJ = r"it|he|she|they|we|you|i|there|this|that|these|those|here|nobody|everyone"
INDEPENDENT = re.compile(r'^(?:%s)\s+' % SUBJ + FINITE.pattern, re.I)
CONTRACTED = re.compile(r"^(?:%s)(?:'|’)(?:s|re|ll|ve|d)\b" % SUBJ, re.I)

RELATIVE = re.compile(r'\b(?:who|whom|whose|which|that)\b', re.I)

# "the only one he has awarded" is a noun phrase, not a sentence. The tell is a
# subject pronoun sitting between the head noun and the verb with no
# conjunction to introduce it: a relative clause with the pronoun dropped.
REDUCED_REL = re.compile(r'^\W*(?:\w+\W+){1,4}?(?:he|she|they|it|we|you|i)\s+'
                         r'(?:has|have|had|is|are|was|were|can|could|will|would|does|do|did)\b',
                         re.I)


def plain(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()


def after_text(text, i):
    return plain(SENT_END.split(text[i:i + 400])[0])


def before_text(text, i):
    return plain(SENT_END.split(text[max(0, i - 400):i])[-1])


def is_clause(seg, window=8):
    """Does this stand as a sentence on its own?"""
    if REDUCED_REL.match(seg):
        return False
    head = RELATIVE.split(seg)[0]          # the verb must be the subject's own
    return bool(FINITE.search(' '.join(head.split()[:window])))


def is_list(seg):
    """A run of items rather than a sentence: "injuries, work, a school term".

    Tested before the clause check because plenty of list items are also verbs
    ("work", "open"), and a lone one of those would otherwise read as the verb
    of a sentence that is not there."""
    if ',' not in seg:
        return False
    head = seg.split(',')[0].strip()
    return len(head.split()) <= 4 and not FINITE.search(head)


def classify(text, start, end):
    after = after_text(text, end)
    before = before_text(text, start)
    if not after:
        return '', 'drop'
    if DEPENDENT.match(after):
        return ', ', 'comma-dependent'
    if INDEPENDENT.match(after) or CONTRACTED.match(after):
        return '. ', 'period'
    if DETERMINER.match(after):
        if is_clause(after):
            return '. ', 'period-determiner'
        # A third comma in one sentence stops separating and starts blurring:
        # "Everything Labyrinth, on one page, the academy and the timer" reads
        # as a list of three. A colon keeps the apposition visible.
        return (': ', 'colon-appositive') if ',' in before else (', ', 'comma-appositive')
    if is_list(after):
        return ': ', 'colon-list'
    if is_clause(after):
        return '. ', 'period-clause'
    if ',' in after.rstrip('.'):
        return ': ', 'colon-list'
    return (': ', 'colon-default') if ',' in before else (', ', 'comma-default')


def convert(text):
    spans = [m.span() for m in DASH.finditer(text)]

    # Pair the asides up front, by index. Deciding "this one opens a bracket"
    # and then treating whatever dash comes next as its close lets the state
    # leak past the end of the sentence: one unmatched open turns the next
    # dash anywhere in the file into a stray ")". The partner has to be a
    # specific dash, inside the same sentence, or there is no pair at all.
    closes = {}
    taken = set()
    for i, (a, b) in enumerate(spans):
        if i in taken:
            continue
        limit = b + len(SENT_END.split(text[b:b + 500])[0])
        for j in range(i + 1, len(spans)):
            if spans[j][0] >= limit:
                break
            if j in taken:
                continue
            # An aside runs inside one field of one line. Two neighbouring
            # records in a template or a JSON block each carrying a single
            # dash are not a pair, and bracketing them writes an open paren
            # into one string and its close into the next.
            between = text[b:spans[j][0]]
            if '\n' in between or '"' in between or '%s' in between:
                continue
            closes[i] = j
            taken.add(i)
            taken.add(j)
            break

    out, changes, pos = [], [], 0
    close_idx = set(closes.values())
    for i, (start_, end) in enumerate(spans):
        if i in close_idx:
            rep, kind = ') ', 'close-paren'
        elif i in closes:
            rep, kind = ' (', 'open-paren'
        else:
            rep, kind = classify(text, start_, end)
        chunk = text[pos:start_]
        if rep in (', ', ': ', '. ') and chunk.rstrip().endswith((',', ':', ';', '.')):
            rep, kind = ' ', kind + '+dedup'   # never double up punctuation
        out.append(chunk)
        out.append(rep)
        pos = end
        changes.append((kind, before_text(text, start_)[-60:], rep.strip() or '\u2423',
                        after_text(text, end)[:65]))
        # Only a full stop this pass inserted may recapitalise, and only the
        # word right after it. A blanket pass would also "fix" lowercase that
        # legitimately follows a period elsewhere in the document.
        if rep == '. ':
            m2 = re.match(r'((?:<[^>]+>|\s)*)([a-z])', text[pos:])
            if m2:
                out.append(m2.group(1) + m2.group(2).upper())
                pos += m2.end()
    out.append(text[pos:])
    return ''.join(out).replace(' ) ', ') '), changes
