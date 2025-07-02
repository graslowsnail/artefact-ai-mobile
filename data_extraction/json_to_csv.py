import json
import csv

# Load the filtered JSON
with open("filtered_output.json", "r", encoding="utf-8") as infile:
    data = json.load(infile)

# Choose which fields to export (these match your DB schema)
fields = [
    "id",
    "object_id",
    "title",
    "artist",
    "date",
    "medium",
    "primary_image",
    "department",
    "culture",
    "created_at",
    "additional_images",
    "object_url",
    "is_highlight",
    "artist_display_bio",
    "object_begin_date",
    "object_end_date",
    "credit_line",
    "classification",
    "artist_nationality",
    "primary_image_small",
    "description"
]

# Write to CSV
with open("filtered_output.csv", "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fields)
    writer.writeheader()
    for obj in data:
        # For safety, ensure all fields exist
        row = {field: obj.get(field, "") for field in fields}
        writer.writerow(row)

print(f"Wrote {len(data)} rows to filtered_output.csv.")
