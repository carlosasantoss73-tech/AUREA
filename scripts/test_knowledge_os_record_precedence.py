import unittest

from scripts.knowledge_os_record_precedence import aggregate_records


def entry(file_id, index_version, record):
    return {"file_id": file_id, "index_version": index_version, "records": [record]}


class AggregateRecordsPrecedenceTests(unittest.TestCase):
    def test_latest_index_wins_when_historical_duplicate_is_visited_later(self):
        result = aggregate_records([
            entry("index-v11", "v011", {"id": "AKL-002", "estado": "VIGENTE"}),
            entry("index-v10", "v010", {"id": "AKL-002", "estado": "PROPUESTA"}),
        ])

        selected = result["records"]["AKL-002"]
        self.assertEqual(selected["record"]["estado"], "VIGENTE")
        self.assertEqual(selected["index_version"], 11)

    def test_different_states_are_reported_without_promoting_selected_state(self):
        result = aggregate_records([
            entry("index-v11", 11, {"id": "AKL-002", "estado": "PROPUESTA"}),
            entry("index-v10", 10, {"id": "AKL-002", "estado": "VIGENTE"}),
        ])

        selected = result["records"]["AKL-002"]
        self.assertEqual(selected["record"]["estado"], "PROPUESTA")
        self.assertTrue(any(
            conflict["reason"] == "RECORD_STATE_CONFLICT"
            for conflict in result["conflicts"]
        ))

    def test_duplicate_without_index_version_fails_closed(self):
        result = aggregate_records([
            entry("index-current", None, {"id": "AKL-002", "estado": "VIGENTE"}),
            entry("index-history", 10, {"id": "AKL-002", "estado": "PROPUESTA"}),
        ])

        self.assertNotIn("AKL-002", result["records"])
        self.assertTrue(any(
            conflict["reason"] == "UNRESOLVED_PRECEDENCE"
            for conflict in result["conflicts"]
        ))

    def test_insufficient_record_identity_is_reported_and_not_selected(self):
        result = aggregate_records([
            entry("index-v11", 11, {"estado": "VIGENTE"}),
        ])

        self.assertEqual(result["records"], {})
        self.assertTrue(any(
            conflict["reason"] == "INVALID_RECORD_ID"
            for conflict in result["conflicts"]
        ))

    def test_non_descending_chain_fails_closed_for_duplicate(self):
        result = aggregate_records([
            entry("index-v10", 10, {"id": "AKL-002", "estado": "VIGENTE"}),
            entry("index-v11", 11, {"id": "AKL-002", "estado": "PROPUESTA"}),
        ])

        self.assertNotIn("AKL-002", result["records"])
        self.assertTrue(any(
            conflict["reason"] == "INDEX_CHAIN_ORDER_CONFLICT"
            for conflict in result["conflicts"]
        ))


if __name__ == "__main__":
    unittest.main()
