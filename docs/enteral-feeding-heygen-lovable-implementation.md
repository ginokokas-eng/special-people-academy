# Enteral Feeding HeyGen SCORM Implementation

Source SharePoint package:

`SpecialPeopleAcademy / Shared Documents / Trainining Academy / 1. Enteral Feeding Package / Enteral_Feeding_PPT_Aligned_HeyGen_Lovable_Pack.zip`

Local prepared folder:

`C:\Users\ginok\Downloads\Special People Training Academy\1. Enteral Feeding Package`

Upload-ready SCORM folder:

`C:\Users\ginok\Downloads\Special People Training Academy\1. Enteral Feeding Package\SCORM Upload Ready for Lovable`

## Course

- Title: `Enteral Feeding Tubes: Management & Competency (NG/PEG/JEJ)`
- Slug: `enteral-feeding-tubes-management-competency`
- Category: `Complex Needs & Specialist Care`
- Delivery: `Blended (Online + Practical sign-off)`
- Practical sign-off required: `true`
- Completion certificate: all SCORM lessons complete and final quiz passed.
- Competency certificate: completion certificate plus practical checklist outcome `Competent`.
- Certificate expiry: 24 months.
- Final quiz pass mark: 80%.
- Final quiz attempts: 2.

## Modules

1. Introduction and route foundations
   Lessons 1-6
2. Verification and feeding methods
   Lessons 7-10
3. Routine care, troubleshooting and medicines
   Lessons 11-13
4. Competency and accountability
   Lesson 14

## SCORM Upload Order

Upload each ZIP in this order through:

`Admin Portal -> Course Builder -> Edit Course -> SCORM -> Upload SCORM Package`

Then attach each uploaded package through:

`Modules & Lessons -> Add/Edit Lesson -> Type: SCORM Package -> Select uploaded package`

| Lesson | Lesson title | Upload-ready SCORM ZIP |
| --- | --- | --- |
| 1 | Introduction, scope and workshop objectives | `enteral_feeding_L01_intro_scope_objectives.zip` |
| 2 | The foundation: what enteral feeding is and why it is used | `enteral_feeding_L02_foundation_what_and_why.zip` |
| 3 | Device selection map: tube routes and safe method matching | `enteral_feeding_L03_device_selection_map.zip` |
| 4 | Short-term access: the nasal route | `enteral_feeding_L04_short_term_nasal_route.zip` |
| 5 | Long-term access: the gastric route (PEG) | `enteral_feeding_L05_long_term_gastric_route_peg.zip` |
| 6 | Long-term access: the post-pyloric route | `enteral_feeding_L06_long_term_post_pyloric_route.zip` |
| 7 | Verification: safety non-negotiables | `enteral_feeding_L07_verification_safety.zip` |
| 8 | Feeding techniques and mechanics | `enteral_feeding_L08_feeding_techniques_mechanics.zip` |
| 9 | Gastric feeding protocols: bolus methods | `enteral_feeding_L09_gastric_bolus_protocols.zip` |
| 10 | Continuous pump feeding | `enteral_feeding_L10_continuous_pump_feeding.zip` |
| 11 | Routine care: daily hygiene and rotation rules | `enteral_feeding_L11_routine_care_rotation_rules.zip` |
| 12 | Troubleshooting: mechanical issues | `enteral_feeding_L12_troubleshooting_mechanical_issues.zip` |
| 13 | Complications and safe medication administration | `enteral_feeding_L13_complications_safe_medication.zip` |
| 14 | Competency summary and accountability | `enteral_feeding_L14_competency_summary_accountability.zip` |

## Supporting Materials

The SharePoint pack has been extracted locally under:

`Course Materials from SharePoint Pack`

Use these source files when updating the course in Lovable:

- `enteral_feeding_course_data_ppt_aligned.json`
- `enteral_feeding_final_quiz_ppt_aligned.csv`
- `enteral_feeding_practical_signoff_checklist_ppt_aligned.csv`
- `enteral_feeding_knowledge_base_ppt_aligned.json`
- `lovable_prompts_enteral_feeding_ppt_aligned.txt`
- `slide_assets/enteral_feeding_slide_01.png` through `slide_assets/enteral_feeding_slide_15.png`

## Lovable Prompt

Use this in Lovable after the HeyGen SCORM readiness changes are merged:

```text
Implement the Enteral Feeding Tubes: Management & Competency course using the SharePoint pack mapping. Keep the existing Supabase SCORM implementation. Create the course with slug enteral-feeding-tubes-management-competency, four modules, fourteen SCORM lessons, final quiz, practical sign-off checklist, and certificate rules. The SCORM ZIPs will be uploaded manually from the local folder named SCORM Upload Ready for Lovable, using the exact filenames listed in docs/enteral-feeding-heygen-lovable-implementation.md. Do not replace the SCORM player or upload implementation.
```

## Validation Notes

All 14 upload-ready ZIP files were checked locally and contain `imsmanifest.xml`.

The upload-ready filenames were normalized from the downloaded HeyGen filenames to match the SharePoint pack upload map.
