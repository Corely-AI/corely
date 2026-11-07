"""Behavioral checks for ticket and person counting; no live services."""

from copy import deepcopy
import unittest

import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("ticket_stats", Path(__file__).with_name("ticket-stats.py"))
if spec is None or spec.loader is None:
    raise RuntimeError("Cannot load ticket statistics helper")
ticket_stats = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ticket_stats)
summarize = ticket_stats.summarize


def issue(number, owners=None, status="In progress", **changes):
    row = {
        "kind": "Issue",
        "url": f"https://github.com/example/repo/issues/{number}",
        "state": "OPEN",
        "assignees": ["alex"] if owners is None else owners,
        "projectStatus": status,
    }
    row.update(changes)
    return row


class TicketStatsTests(unittest.TestCase):
    def test_shared_tickets_reconcile_assignment_and_status_totals(self):
        result = summarize([issue(1, ["alex", "sam"]), issue(2, status="In review"), issue(3, ["sam"])])
        self.assertEqual(result["uniqueOpenAssignedTickets"], 3)
        self.assertEqual(result["assignments"], 4)
        self.assertEqual(result["sharedTickets"], 1)
        self.assertEqual(result["uniqueInProgressTickets"], 2)
        owners = {x["owner"]: x for x in result["accounts"]}
        self.assertEqual((owners["alex"]["total"], owners["alex"]["inProgress"]), (2, 1))
        self.assertEqual(owners["sam"]["inProgress"], 2)
        self.assertEqual(sum(result["byStatus"].values()), 3)
        self.assertEqual(sum(x["total"] for x in result["accounts"]), 4)

    def test_verified_aliases_deduplicate_one_person_with_two_accounts(self):
        rows = [issue(1, ["alex", "alex-work", "sam"]), issue(2, ["alex-work"])]
        result = summarize(rows, {"alex": "Alex Example", "alex-work": "Alex Example"})
        people = {x["owner"]: x for x in result["people"]}
        self.assertEqual(people["Alex Example"]["inProgress"], 2)
        self.assertEqual(result["assignments"], 4)
        self.assertEqual(result["personAssignments"], 3)
        self.assertEqual(result["personSharedTickets"], 1)

    def test_no_person_inference_without_aliases(self):
        result = summarize([issue(1, ["alex", "alex-work"])])
        self.assertNotIn("people", result)
        self.assertEqual(len(result["accounts"]), 2)

    def test_closed_unassigned_and_project_nonissues_are_excluded(self):
        rows = [issue(1), issue(2, state="CLOSED"), issue(3, []),
                {"kind": "PullRequest"}, {"kind": "DraftIssue"}, {"kind": "REDACTED"}]
        result = summarize(rows)
        self.assertEqual(result["uniqueOpenAssignedTickets"], 1)
        self.assertEqual(result["excludedRows"], {
            "closed": 1, "unassigned": 1, "nonIssue": 3, "identicalDuplicate": 0})

    def test_custom_and_missing_status_are_preserved(self):
        result = summarize([issue(1, status="Config Environments"), issue(2, status=None),
                            issue(3, status="Doing")], in_progress="Doing")
        self.assertEqual(result["byStatus"], {"Config Environments": 1, "Doing": 1, "Missing status": 1})
        self.assertEqual(result["uniqueInProgressTickets"], 1)

    def test_same_number_in_another_repository_is_not_a_duplicate(self):
        result = summarize([issue(1), issue(1, url="https://github.com/example/other/issues/1")])
        self.assertEqual(result["uniqueOpenAssignedTickets"], 2)

    def test_identical_copies_and_repeated_logins_count_once(self):
        row = issue(1, ["Alex", "alex"])
        result = summarize([row, deepcopy(row)])
        self.assertEqual(result["assignments"], 1)
        self.assertEqual(result["excludedRows"]["identicalDuplicate"], 1)

    def test_conflicting_duplicate_requires_snapshot_reconciliation(self):
        with self.assertRaisesRegex(ValueError, "conflicts"):
            summarize([issue(1), issue(1, status="Done")])

    def test_malformed_or_missing_fields_do_not_produce_success_counts(self):
        for row in [issue(1, assignees="alex"), issue(1, state="UNKNOWN"),
                    issue(1, kind=""), issue(1, url="https://example.com/no-issue"),
                    issue(1, url="https://token:secret@github.com/example/repo/issues/1")]:
            with self.subTest(row=row), self.assertRaises(ValueError):
                summarize([row])

    def test_empty_inventory_and_alias_conflict(self):
        self.assertEqual(summarize([])["uniqueOpenAssignedTickets"], 0)
        with self.assertRaisesRegex(ValueError, "conflicting"):
            summarize([], {"Alex": "Person A", "alex": "Person B"})


if __name__ == "__main__":
    unittest.main()
