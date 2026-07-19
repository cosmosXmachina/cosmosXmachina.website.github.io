import re
import sqlite3
from typing import Any

DOCUMENTS = [
    {
        "source": "Service policy v3.2",
        "section": "4.1 Expedited replacement",
        "content": "Gold customers may request an expedited replacement when an Orion sensor fails during production after serial-number validation.",
        "roles": {"support", "sales"},
    },
    {
        "source": "Support handbook",
        "section": "Identity and serial validation",
        "content": "Support must validate the customer identity, product serial number, warranty state, and failure symptoms before replacement.",
        "roles": {"support"},
    },
    {
        "source": "Commercial handbook",
        "section": "Customer tiers",
        "content": "Sales may explain Gold service coverage and introduce a support specialist for technical replacement requests.",
        "roles": {"sales"},
    },
    {
        "source": "People operations",
        "section": "Compensation",
        "content": "Employee salary bands and individual compensation records are confidential.",
        "roles": {"hr"},
    },
    {
        "source": "Infrastructure runbook",
        "section": "Credentials",
        "content": "Production passwords and private keys are restricted to infrastructure administrators.",
        "roles": {"admin"},
    },
]

STOP_WORDS = {
    "a", "an", "and", "are", "can", "do", "during", "if", "in", "is",
    "it", "of", "or", "the", "to", "what", "when", "with",
}


def search_permitted(question: str, role: str, limit: int = 3) -> list[dict[str, Any]]:
    terms = [
        token
        for token in re.findall(r"[a-z0-9]+", question.lower())
        if len(token) > 2 and token not in STOP_WORDS
    ]
    if not terms:
        return []

    permitted = [document for document in DOCUMENTS if role in document["roles"]]
    if not permitted:
        return []

    connection = sqlite3.connect(":memory:")
    try:
        connection.execute(
            "CREATE VIRTUAL TABLE permitted_docs USING fts5(source, section, content)"
        )
        connection.executemany(
            "INSERT INTO permitted_docs(source, section, content) VALUES (?, ?, ?)",
            [
                (document["source"], document["section"], document["content"])
                for document in permitted
            ],
        )
        query = " OR ".join('"' + term + '"' for term in sorted(set(terms)))
        rows = connection.execute(
            """
            SELECT source, section, content, bm25(permitted_docs) AS score
            FROM permitted_docs
            WHERE permitted_docs MATCH ?
            ORDER BY score
            LIMIT ?
            """,
            (query, limit),
        ).fetchall()
        return [
            {
                "source": source,
                "section": section,
                "excerpt": content,
                "score": round(float(score), 6),
            }
            for source, section, content, score in rows
        ]
    finally:
        connection.close()
