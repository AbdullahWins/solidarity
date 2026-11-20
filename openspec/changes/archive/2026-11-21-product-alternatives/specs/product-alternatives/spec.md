# Spec Delta

## Purpose

Gives users a concrete next step on an avoid result by suggesting products in the same category that they have already scanned as fine.

## ADDED Requirements

### Requirement: Suggest alternatives from your own history
When a result's primary verdict is avoid and the scanned product has at least one known category, the result SHALL list up to 3 different products from the user's History that share a category and whose verdict was fine, most recent first, each with its name and country. Suggestions SHALL be computed on the device without network requests.

#### Scenario: Olive oil to avoid
- **WHEN** the user scans an olive oil whose verdict is avoid, and History contains two fine olive oils
- **THEN** the result shows both as alternatives, newest first

#### Scenario: Nothing suitable
- **WHEN** no fine product in History shares a category with the scanned product
- **THEN** no alternatives section is shown

#### Scenario: Not an avoid result
- **WHEN** the verdict is fine or neutral
- **THEN** no alternatives section is shown
