"""Check invariants that follow from Prompt-to-Bench's run_one loop."""


def audit_attempts(attempts):
    """Reject internally contradictory records, including retries after success."""
    for index, attempt in enumerate(attempts):
        if attempt['passed'] and not attempt['render']['ok']:
            raise ValueError('passing attempt requires successful rendering')
        if attempt['passed'] and index != len(attempts) - 1:
            raise ValueError('attempt recorded after first pass')
        if 'attempt' in attempt and (type(attempt['attempt']) is not int or attempt['attempt'] != index):
            raise ValueError('attempt indices are not consecutive')
        if 'check' in attempt:
            check = attempt['check']
            if check is None:
                if attempt['passed']:
                    raise ValueError('passing attempt requires a check result')
            elif (not isinstance(check, dict) or type(check.get('passed')) is not bool
                  or check['passed'] != attempt['passed'] or not attempt['render']['ok']):
                raise ValueError('check verdict contradicts attempt or rendering')
