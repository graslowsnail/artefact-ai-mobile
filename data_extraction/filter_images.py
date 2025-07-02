import json

# Load your big JSON file
with open("metJsonDataDump.json", "r", encoding="utf-8") as infile:
    data = json.load(infile)

# Filter objects that have a primary_image
filtered_data = [
    obj for obj in data
    if obj.get("primary_image") and obj["primary_image"].strip() != ""
]

# Save to a new JSON file
with open("filtered_output.json", "w", encoding="utf-8") as outfile:
    json.dump(filtered_data, outfile, ensure_ascii=False, indent=2)

print(f"Filtered {len(filtered_data)} objects with images.")