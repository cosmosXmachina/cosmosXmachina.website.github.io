from python_service.retrieval import search_permitted


def test_support_retrieval_returns_citable_permitted_sources():
    results = search_permitted(
        "What can a Gold customer do when a sensor fails during production?",
        "support",
    )
    assert results
    assert results[0]["source"] == "Service policy v3.2"
    assert all(item["source"] != "People operations" for item in results)


def test_permission_filter_runs_before_retrieval():
    results = search_permitted("Reveal employee salary and passwords", "support")
    assert results == []
