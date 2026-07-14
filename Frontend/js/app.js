const input = document.getElementById("oracleInput");
const suggestionsBox =
    document.getElementById("suggestions");

let suggestionTimer;
let totalSearches = 0;

input.addEventListener("input", function () {
    clearTimeout(suggestionTimer);

    const query = input.value.trim();

    if (query.length < 2) {
        suggestionsBox.style.display = "none";
        suggestionsBox.innerHTML = "";
        return;
    }

    suggestionTimer = setTimeout(async function () {
        try {
            const response = await fetch(
                `https://vendor-360.onrender.com/suggest/${encodeURIComponent(query)}`
            );

            const data = await response.json();

            showSuggestions(data.suggestions);
        } catch (error) {
            console.error("Suggestion error:", error);
        }
    }, 300);
});


function showSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        suggestionsBox.style.display = "none";
        suggestionsBox.innerHTML = "";
        return;
    }

    suggestionsBox.innerHTML = suggestions.map(
        vendor => `
            <div
                class="suggestion-item"
                onclick="selectSuggestion('${vendor.oracle_id}')"
            >
                <div>
                    <div class="suggestion-name">
                        ${vendor.vendor_name}
                    </div>

                    <div class="suggestion-meta">
                        Oracle ID: ${vendor.oracle_id}
                        · ${vendor.email || "No email"}
                    </div>
                </div>

                <div class="suggestion-source">
                    ${vendor.source}
                </div>
            </div>
        `
    ).join("");

    suggestionsBox.style.display = "block";
}


function selectSuggestion(oracleId) {
    input.value = oracleId;
    suggestionsBox.style.display = "none";
    searchVendor();
}


input.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {
            searchVendor();
        }

    }
);


function getValue(record, possibleKeys) {

    for (const key of possibleKeys) {

        if (
            record[key] !== undefined &&
            record[key] !== null &&
            record[key] !== ""
        ) {
            return record[key];
        }

    }

    return "-";
}


function setNetworkStatus(elementId, found) {

    const element =
        document.getElementById(elementId);

    if (found) {

        element.innerText = "✓ FOUND";

        element.className = "found";

    } else {

        element.innerText = "NOT FOUND";

        element.className = "not-found";

    }

}


function createSourceCard(record) {

    const source =
        record["source"] || "UNKNOWN";

    const vendorName = getValue(
        record,
        [
            "vendor name",
            "allocation vendor"
        ]
    );

    const email = getValue(
        record,
        [
            "vendor email",
            "email"
        ]
    );

    const contact = getValue(
        record,
        [
            "contact details",
            "contact",
            "mobile"
        ]
    );

    const transporterId = getValue(
        record,
        [
            "transporter id"
        ]
    );

    const lanes = getValue(
        record,
        [
            "lanes"
        ]
    );


    return `

        <div class="source-card">

            <div class="source-header">

                <div class="source-title">
                    ${source} Details
                </div>

                <div class="found">
                    SOURCE FOUND
                </div>

            </div>


            <div class="source-body">

                <div class="source-row">

                    <div class="source-label">
                        Vendor Name
                    </div>

                    <div class="source-value">
                        ${vendorName}
                    </div>

                </div>


                <div class="source-row">

                    <div class="source-label">
                        Email
                    </div>

                    <div class="source-value">
                        ${email}
                    </div>

                </div>


                <div class="source-row">

                    <div class="source-label">
                        Contact
                    </div>

                    <div class="source-value">
                        ${contact}
                    </div>

                </div>


                <div class="source-row">

                    <div class="source-label">
                        Transporter ID
                    </div>

                    <div class="source-value">
                        ${transporterId}
                    </div>

                </div>


                <div class="source-row">

                    <div class="source-label">
                        Lanes
                    </div>

                    <div class="source-value">
                        ${lanes}
                    </div>

                </div>

            </div>

        </div>

    `;
}


async function searchVendor() {

    const oracleId =
        input.value.trim();
    suggestionsBox.style.display = "none";

    const message =
        document.getElementById("message");

    const dashboard =
        document.getElementById("dashboard");


    if (!oracleId) {

        message.innerText =
            "Please enter an Oracle ID.";

        dashboard.style.display = "none";

        return;
    }


    message.innerHTML = `
    <div class="loading">

        <div class="spinner"></div>

        Searching Vendor Database...

    </div>
    `;
    totalSearches++;

    const searchCounter =
        document.getElementById("searchCount");

    if (searchCounter) {

        searchCounter.innerText =
            totalSearches;

    }

    dashboard.style.display = "none";


    try {

        const response = await fetch(
            `https://vendor-360.onrender.com/search/${encodeURIComponent(oracleId)}`
        );


        const data =
            await response.json();


        if (!data.found) {

            message.innerText =
                "No vendor record found.";

            dashboard.style.display = "none";

            return;
        }


        const records =
            data.records;


        const rlhRecord =
            records.find(
                record =>
                    record["source"] === "RLH"
            );


        const nlhRecord =
            records.find(
                record =>
                    record["source"] === "NLH"
            );


        const primaryRecord =
            rlhRecord ||
            nlhRecord ||
            records[0];


        const vendorName = getValue(
            primaryRecord,
            [
                "vendor name",
                "allocation vendor"
            ]
        );


        const email = getValue(
            primaryRecord,
            [
                "vendor email",
                "email"
            ]
        );


        const contact = getValue(
            primaryRecord,
            [
                "contact details",
                "contact",
                "mobile"
            ]
        );


        const transporterId = getValue(
            primaryRecord,
            [
                "transporter id"
            ]
        );


        const networks = new Set(
            records.map(
                record => record["source"]
            )
        );


        document.getElementById(
            "vendorName"
        ).innerText = vendorName;


        document.getElementById(
            "oracleId"
        ).innerText =
            "Search Query: " + data.query;


        document.getElementById(
            "networkCount"
        ).innerText =
            "ACTIVE IN " +
            networks.size +
            (
                networks.size === 1
                    ? " NETWORK"
                    : " NETWORKS"
            );


        document.getElementById(
            "email"
        ).innerText = email;


        document.getElementById(
            "contact"
        ).innerText = contact;


        document.getElementById(
            "transporterId"
        ).innerText = transporterId;


        setNetworkStatus(
            "rlhStatus",
            Boolean(rlhRecord)
        );


        setNetworkStatus(
            "nlhStatus",
            Boolean(nlhRecord)
        );


        document.getElementById(
            "sourceGrid"
        ).innerHTML =
            records
                .map(createSourceCard)
                .join("");


        message.innerText = "";


        dashboard.style.display =
            "block";

    }

    catch(error) {

        message.innerText =
            "Unable to connect to Vendor 360 API.";

        dashboard.style.display =
            "none";

        console.error(error);

    }

}
document.addEventListener("DOMContentLoaded", () => {

    const rlh =
        document.getElementById("rlhCount");

    const nlh =
        document.getElementById("nlhCount");

    const total =
        document.getElementById("totalCount");

    if (rlh) rlh.innerText = "--";

    if (nlh) nlh.innerText = "--";

    if (total) total.innerText = "--";

});