---
version: 1
slug: 'src-app-games-nha-minh'
primary_target: 'src/app/games/nha-minh'
related_targets: ['src/games/nha-minh']
---

# Nhà Mình (/games/nha-minh)

Scope: the game's own screens: entry (create a house room, join by code, saved houses) and the build screen (3D cutaway house, drag to rotate, pinch/wheel to zoom; panels for walls, floor tiles, furniture and family goals). Mode: operate. Phone-first; two people, each on their own phone, often a couple or family members in the evening.
Audience/job: two players build one family house together online (room code/QR, same PeerJS layer as the other games) on one shared budget; family goals (a room for the kids, a working kitchen, a garden) pay out more money and unlock furniture. The house is saved and resumed across sessions (owner's choices).
Constraints: original world, no borrowing from any existing house-building game; must look unlike the other eight games. First delivery is a UI preview with labelled demo data; networking, rules and saving come after approval.
Unresolved: catalog size and prices, goal list and rewards, who stores the saved house (host device only vs both), wall drawing gesture on touch.

## Direction contract

THESIS: The house is built on a floor of patterned gạch bông: each room is known by its tile, and the shared budget is laid out tile by tile; refuses the category default of white panels, a blue buy button and a lawn-green yard.
OWN-WORLD: Cement grey #d9d4cb ground, lime-wash #f2efe9 panels with a gạch bông band edge, oxblood #8c2f2b, deep teal #1f5f5b, turmeric ochre #d4a039 (money and the one primary action, ink text on it), ink #26221f. Player A is oxblood, player B is teal, everywhere. Josefin Sans display + Mulish body; tile swatches drawn from the same canvas patterns as the 3D floors.
STORY: Both players see the house, each other's cursor and pick, how much money is left and who spent it, and which family goal is next; they pick, place and finish goals together.
FIRST VIEWPORT: 390x844 build screen: top bar with A left, room code centre, B right; budget as a row of tiles filling in each spender's colour; 3D cutaway house fills the middle with room labels carrying their tile swatch and both players' selections outlined in their colours; bottom sheet with tabs Xây, Sàn, Nội thất, Mục tiêu and one ochre primary button naming the action and price.
FORM: Candidate 1 of 7 (Gạch bông, the pick card; user-chosen over the assigned Nhà bìa cứng). seed:a907a86c3e7040b9. Raises: budget is a fixed row of tiles that fills and cannot overflow (from the cassette j-card); A always left, B always right, mirrored on every screen (from labanotation); while a piece is being placed the rest of the house dims (from datamatics focus).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
