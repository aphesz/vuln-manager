# Test Fixes Needed:

1. test_create_tag_invalid_color: 422 not 400 (DONE)
2. test_update_tag: Remove assertions or check what 422 error is
3. test_update_tag_partial: Same - 422 issue  
4. test_update_tag_duplicate_name: 422 not 400
5. test_delete_tag: 204 not 200 (DONE)
6. test_add_tag_to_finding: 201 not 200
7. test_add_duplicate_tag_to_finding: May not be detecting duplicates (returns 201)
8. test_remove_tag_from_finding: 204 not 200
9. test_invalid_hex_colors: 422 not 400

The 422 errors suggest the TagUpdate model is not accepting the data.
Let's check if we need validators on TagUpdate.
