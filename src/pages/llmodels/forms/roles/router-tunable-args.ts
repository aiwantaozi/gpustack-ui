/**
 * Reading and writing one router flag inside a flat parameter list.
 *
 * Its own module because what it encodes is the shipped routers' argparse
 * semantics — last-wins for every tunable flag, both `--flag value` and
 * `--flag=value` accepted — and that is a fact about them rather than about
 * any control. Keeping it free of React also makes it runnable on its own,
 * which is the only way to check the round trip in a repo with no test runner.
 */

/**
 * The last occurrence of `flag`'s value, or undefined when it is not set.
 *
 * Backwards on purpose: repeated flags are last-wins in both shipped routers
 * (verified against the wheels — `--decode-policy round_robin --decode-policy
 * cache_aware` parses to `cache_aware`), so the last one is what the router
 * will actually run and therefore the only honest thing to display.
 *
 * Both spellings are read because both are valid on a command line and the
 * free-text list below lets a user type either.
 */
export const readOverride = (
  params: string[] | undefined | null,
  flag: string
): string | undefined => {
  const list = params || [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const token = String(list[i] ?? '');
    if (token === flag) {
      return String(list[i + 1] ?? '');
    }
    if (token.startsWith(`${flag}=`)) {
      return token.slice(flag.length + 1);
    }
  }
  return undefined;
};

/**
 * `params` with every occurrence of `flag` replaced by one `--flag=value`, or
 * removed when `value` is empty.
 *
 * Written as a single `--flag=value` token rather than a pair so that one
 * override reads as one entry in the list below — two rows for one decision
 * is what made the earlier reading of this field confusing. Every prior
 * occurrence goes, in either spelling, so toggling a select twice cannot leave
 * a stale pair behind for the parser to resolve.
 */
export const writeOverride = (
  params: string[] | undefined | null,
  flag: string,
  value?: string | number | null
): string[] => {
  const list = params || [];
  const out: string[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const token = String(list[i] ?? '');
    if (token === flag) {
      // Skip its value too — a bare flag takes the next token.
      i += 1;
      continue;
    }
    if (token.startsWith(`${flag}=`)) {
      continue;
    }
    out.push(list[i]);
  }
  if (value !== undefined && value !== null && `${value}` !== '') {
    out.push(`${flag}=${value}`);
  }
  return out;
};
