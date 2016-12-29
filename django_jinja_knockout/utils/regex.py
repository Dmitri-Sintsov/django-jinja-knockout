# regex can be without capturing group.
def finditer_with_separators(regex, s):
    matches = []
    prev_end = 0
    for match in regex.finditer(s):
        match_start = match.start()
        if (prev_end != 0 or match_start > 0) and match_start != prev_end:
            matches.append(s[prev_end:match.start()])
        matches.append(match.group())
        prev_end = match.end()
    if prev_end < len(s):
        matches.append(s[prev_end:])
    return matches


# regex should have capturing group.
def split_with_separators(regex, s):
    matches = list(filter(None, regex.split(s)))
    return matches
