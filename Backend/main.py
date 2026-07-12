from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pathlib import Path

app = FastAPI(title="Vendor 360 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

RLH_FILE = DATA_DIR / "RLH.xlsx"
NLH_FILE = DATA_DIR / "NLH.xlsx"


def clean_column_name(column):
    return str(column).strip().lower()


def clean_search_value(value):
    if pd.isna(value):
        return ""

    value = str(value).strip().lower()

    if value.endswith(".0"):
        value = value[:-2]

    return value


def load_vendor_data():
    rlh = pd.read_excel(RLH_FILE, sheet_name="Vendor")
    nlh = pd.read_excel(NLH_FILE, sheet_name="Vendor")

    rlh.columns = [
        clean_column_name(col)
        for col in rlh.columns
    ]

    nlh.columns = [
        clean_column_name(col)
        for col in nlh.columns
    ]

    rlh["source"] = "RLH"
    nlh["source"] = "NLH"

    return rlh, nlh


rlh_data, nlh_data = load_vendor_data()


def find_oracle_column(dataframe):
    for column in dataframe.columns:
        if "oracle" in column or "oracel" in column:
            return column

    return None


def detect_match_type(column):
    column = column.lower()

    if "oracle" in column or "oracel" in column:
        return "Oracle ID"

    if "vendor name" in column or column == "name":
        return "Vendor Name"

    if "email" in column:
        return "Email"

    if (
        "contact" in column
        or "mobile" in column
        or "phone" in column
    ):
        return "Contact"

    return column.title()


@app.get("/")
def home():
    return {
        "message": "Vendor 360 API is running",
        "version": "2.1",
        "search": "Smart Search Enabled"
    }


@app.get("/search/{query}")
def search_vendor(query: str):
    results = []

    search_query = clean_search_value(query)

    datasets = [
        ("RLH", rlh_data),
        ("NLH", nlh_data)
    ]

    for source_name, dataframe in datasets:

        matched_indexes = set()
        matched_columns = {}

        for column in dataframe.columns:

            if column == "source":
                continue

            column_values = dataframe[column].apply(
                clean_search_value
            )

            exact_matches = dataframe[
                column_values == search_query
            ]

            for index in exact_matches.index:
                matched_indexes.add(index)

                if index not in matched_columns:
                    matched_columns[index] = []

                matched_columns[index].append(column)

        for index in matched_indexes:
            row = dataframe.loc[index]

            vendor_data = {}

            for column, value in row.items():

                if pd.isna(value):
                    vendor_data[column] = None
                else:
                    vendor_data[column] = str(value)

            vendor_data["source"] = source_name

            match_fields = matched_columns.get(
                index,
                []
            )

            vendor_data["matched_by"] = [
                detect_match_type(column)
                for column in match_fields
            ]

            results.append(vendor_data)

    if not results:
        return {
            "found": False,
            "message": "No vendor record found",
            "query": query
        }

    return {
        "found": True,
        "query": query,
        "total_records": len(results),
        "records": results
    }

@app.get("/suggest/{query}")
def suggest_vendors(query: str):
    suggestions = []

    search_query = clean_search_value(query)

    if len(search_query) < 2:
        return {"suggestions": []}

    datasets = [
        ("RLH", rlh_data),
        ("NLH", nlh_data)
    ]

    seen_vendors = set()

    for source_name, dataframe in datasets:
        oracle_column = find_oracle_column(dataframe)

        for _, row in dataframe.iterrows():
            vendor_name = ""

            for name_column in ["vendor name", "allocation vendor"]:
                if name_column in dataframe.columns:
                    value = row.get(name_column)

                    if not pd.isna(value):
                        vendor_name = str(value).strip()
                        break

            oracle_id = ""

            if oracle_column:
                value = row.get(oracle_column)

                if not pd.isna(value):
                    oracle_id = clean_search_value(value)

            email = ""

            for email_column in ["vendor email", "email"]:
                if email_column in dataframe.columns:
                    value = row.get(email_column)

                    if not pd.isna(value):
                        email = str(value).strip()
                        break

            searchable_text = (
                vendor_name.lower()
                + " "
                + oracle_id.lower()
                + " "
                + email.lower()
            )

            if search_query in searchable_text:
                unique_key = (
                    vendor_name.lower(),
                    oracle_id
                )

                if unique_key in seen_vendors:
                    continue

                seen_vendors.add(unique_key)

                suggestions.append({
                    "vendor_name": vendor_name,
                    "oracle_id": oracle_id,
                    "email": email,
                    "source": source_name
                })

            if len(suggestions) >= 8:
                break

        if len(suggestions) >= 8:
            break

    return {"suggestions": suggestions}