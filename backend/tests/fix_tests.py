import re

with open('test_vulnerability_templates.py', 'r') as f:
    content = f.read()

# Find test functions that still reference sample_template_data without defining it
# Add the definition at the start of these functions
pattern = r'(    def test_[a-z_]+\(self, client\):\n        """[^"]*""")\n(        # Create template\n        create_response = client\.post\("/vulnerability-templates", json=sample_template_data\))'

replacement = r'\1\n        sample_template_data = get_sample_template_data()\n        \n\2'

content = re.sub(pattern, replacement, content)

with open('test_vulnerability_templates.py', 'w') as f:
    f.write(content)

print("Fixed test functions")
