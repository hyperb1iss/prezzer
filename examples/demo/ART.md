# Demo artwork

The demo uses ten local WebP illustrations. Eight were created with Codex's built-in image generator on September 3, 2026. The title nebula and one-file shard came from existing local PNG artwork; their original generation prompts were not available.

The images follow SilkCircuit Neon, with glowing glass creatures, floating theatres, and moonlit paper boats alongside the component and motion studies. Text remains live HTML above the art. Literal `/art/*.webp` paths let `prezzer build` embed every illustration in the offline file.

All ten delivery files live in `public/art/`. WebP conversion uses `cwebp -q 88 -m 6` at the original dimensions, without cropping. Existing PNG sources are left untouched.

## Final generation prompts

Each section records the exact prompt used for its image. No reference images were supplied.

### component-prism

Output: `public/art/component-prism.webp`

```text
Use case: stylized-concept. Asset: premium 16:9 wide presentation artwork for Prezzer, a cinematic code-first presentation engine. SilkCircuit Neon brand: almost-black plum #12101a, electric purple #e135ff and luminous mint cyan #80ffea, restrained coral #ff6ac1 highlights. Art direction: sophisticated cinematic 3D editorial render, exquisite optical glass, dark polished metal, sharp crafted details, physically convincing refractions, deep contrast, restrained bloom, elegant not noisy. No text, letters, numbers, logos, watermark, UI, charts, collage, people, stock-photo aesthetic, or busy circuitry wallpaper. The image should feel like a beautifully photographed impossible sculpture. An exploded assembly of three rounded rectangular smoked-glass plates and a small iridescent luminous cube suspended between them, precision-machined like a beautiful computing artifact, cyan edge lights and purple caustics. Entire sculptural subject fits in the RIGHT 35% of a wide composition, center and LEFT 65% remain near-black and visually quiet for a readable code panel. A crisp macro-product rendering with depth.
```

### transition-ribbon

Output: `public/art/transition-ribbon.webp`

```text
Use case: stylized-concept. Asset: premium 16:9 wide presentation artwork for Prezzer, a cinematic code-first presentation engine. SilkCircuit Neon brand: almost-black plum #12101a, electric purple #e135ff and luminous mint cyan #80ffea, restrained coral #ff6ac1 highlights. Art direction: sophisticated cinematic 3D editorial render, exquisite optical glass, dark polished metal, sharp crafted details, physically convincing refractions, deep contrast, restrained bloom, elegant not noisy. No text, letters, numbers, logos, watermark, UI, charts, collage, people, stock-photo aesthetic, or busy circuitry wallpaper. The image should feel like a beautifully photographed impossible sculpture. A single twisting ribbon of iridescent optical glass makes an elegant spiral through deep dark space, crystalline pleats and fine etched facets, cyan on one edge electric purple on the other. Ribbon flows horizontally across the BOTTOM THIRD and sweeps up the far RIGHT EDGE. UPPER TWO THIRDS dark nearly empty space where a presentation will display eight typography labels. Wide dynamic composition, beautiful flowing movement frozen as sculpture.
```

### pitch-theatre

Output: `public/art/pitch-theatre.webp`

```text
Use case: stylized-concept. Asset: gorgeous wide 16:9 cinematic presentation illustration for Prezzer, in the SilkCircuit Neon brand. Color palette: near-black plum #12101a, glowing electric purple #e135ff and luminous mint cyan #80ffea, small coral-pink #ff6ac1 accents. This revision must be WHIMSICAL, charming, playful and wondrous, NOT technical or industrial. Think sophisticated magical realism, an art-house animated film rendered in exquisite luminous glass, soft silk, and starlight. Iridescent surfaces, translucent delicate materials, tactile detail, enchanting cinematic light, restrained bloom. NO text, letters, numbers, logos, watermarks, UI, robot faces, machinery, servers, mechanical equipment, cyberpunk weapons, or generic tech wallpaper. An impossible tiny theatre floating on a crescent-shaped island in a dark cosmic sea. Billowing violet silk curtains open around a luminous cyan moon on stage; a few small paper stars, whimsical staircases that curl in the air, and two miniature floating balcony islands. Entire enchanted theatre scene occupies RIGHT 45% of frame. LEFT 55% is uninterrupted quiet dark plum negative space for live presentation text. Low camera, magical stage lighting, elegant slightly surreal sculpture, handcrafted storybook wonder.
```

### beat-jellyfish

Output: `public/art/beat-jellyfish.webp`

```text
Use case: stylized-concept. Asset: gorgeous wide 16:9 cinematic presentation illustration for Prezzer, in the SilkCircuit Neon brand. Color palette: near-black plum #12101a, glowing electric purple #e135ff and luminous mint cyan #80ffea, small coral-pink #ff6ac1 accents. This revision must be WHIMSICAL, charming, playful and wondrous, NOT technical or industrial. Think sophisticated magical realism, an art-house animated film rendered in exquisite luminous glass, soft silk, and starlight. Iridescent surfaces, translucent delicate materials, tactile detail, enchanting cinematic light, restrained bloom. NO text, letters, numbers, logos, watermarks, UI, robot faces, machinery, servers, mechanical equipment, cyberpunk weapons, or generic tech wallpaper. Four graceful bioluminescent jellyfish drifting diagonally upward like dancers through a velvet-black cosmic ocean, luminous glass bells glowing mint cyan, flowing long violet silk tentacles and little delicate pearl bubbles. Distinct rhythmic sizes and silhouettes, playful gentle movement, sophisticated dreamlike marine wonder. All jellyfish clustered in RIGHT 45% of wide frame; LEFT 55% remains very dark quiet negative space for large text. No aquarium edges, no technology, not an infographic.
```

### bake-dragon

Output: `public/art/bake-dragon.webp`

```text
Use case: stylized-concept. Asset: gorgeous wide 16:9 cinematic presentation illustration for Prezzer, in the SilkCircuit Neon brand. Color palette: near-black plum #12101a, glowing electric purple #e135ff and luminous mint cyan #80ffea, small coral-pink #ff6ac1 accents. This revision must be WHIMSICAL, charming, playful and wondrous, NOT technical or industrial. Think sophisticated magical realism, an art-house animated film rendered in exquisite luminous glass, soft silk, and starlight. Iridescent surfaces, translucent delicate materials, tactile detail, enchanting cinematic light, restrained bloom. NO text, letters, numbers, logos, watermarks, UI, robot faces, machinery, servers, mechanical equipment, cyberpunk weapons, or generic tech wallpaper. An adorable tiny dragon made of translucent violet opal glass, curled on a dark little floating rock, gently breathing a small ribbon of mint-cyan starlight onto a levitating faceted crystal. The dragon has expressive kind eyes, elegant curled horns, rounded paws and beautiful silk-like wing membranes; charming, curious, not fierce. A few tiny sparkling crystal crumbs float nearby as though it is baking a universe. Whole dragon-and-crystal vignette in RIGHT 45% of wide frame. LEFT 55% nearly black and empty for a readable terminal panel. Exquisitely crafted art object in magical cinematic light, no machinery.
```

### access-cat

Output: `public/art/access-cat.webp`

```text
Use case: stylized-concept. Asset: gorgeous wide 16:9 cinematic presentation illustration for Prezzer, in the SilkCircuit Neon brand. Color palette: near-black plum #12101a, glowing electric purple #e135ff and luminous mint cyan #80ffea, small coral-pink #ff6ac1 accents. This revision must be WHIMSICAL, charming, playful and wondrous, NOT technical or industrial. Think sophisticated magical realism, an art-house animated film rendered in exquisite luminous glass, soft silk, and starlight. Iridescent surfaces, translucent delicate materials, tactile detail, enchanting cinematic light, restrained bloom. NO text, letters, numbers, logos, watermarks, UI, robot faces, machinery, servers, mechanical equipment, cyberpunk weapons, or generic tech wallpaper. A mischievous small black cat with translucent violet glass fur and large glowing mint-cyan eyes sitting proudly in front of a tall circular moon-door made from intertwined luminous flowering vines. One paw raised like an overconfident tiny guardian, long curled tail, endearing sly expression, a little coral flower on its head. The moon-door opens onto a tiny dreamscape. Entire whimsical guardian vignette in RIGHT 45% of wide frame; LEFT 55% quiet very dark plum negative space for large presentation headlines. Luxurious whimsical art-house animation render, elegant magical glass and silk, not mechanical.
```

### agent-moth

Output: `public/art/agent-moth.webp`

```text
Use case: stylized-concept. Asset: gorgeous wide 16:9 cinematic presentation illustration for Prezzer, in the SilkCircuit Neon brand. Color palette: near-black plum #12101a, glowing electric purple #e135ff and luminous mint cyan #80ffea, small coral-pink #ff6ac1 accents. This revision must be WHIMSICAL, charming, playful and wondrous, NOT technical or industrial. Think sophisticated magical realism, an art-house animated film rendered in exquisite luminous glass, soft silk, and starlight. Iridescent surfaces, translucent delicate materials, tactile detail, enchanting cinematic light, restrained bloom. NO text, letters, numbers, logos, watermarks, UI, robot faces, machinery, servers, mechanical equipment, cyberpunk weapons, or generic tech wallpaper. An enormous luminous silk moth in a dark cosmic garden, sweeping translucent violet wings embroidered with fine mint-cyan starlight veins; the moth is gently pulling delicate glowing silk threads that weave into a tiny floating origami theatre below. A few miniature star-shaped flowers and drifting paper petals, graceful curved threads, a charming small-world creative metaphor. All moth and theatre art in RIGHT 45% of the wide frame. LEFT 55% uninterrupted dark negative space for headlines and a command line. Enchanting refined magical realism, silk and glass materials, no technological loom or machinery.
```

### closing-moonboats

Output: `public/art/closing-moonboats.webp`

```text
Use case: stylized-concept. Asset: gorgeous wide 16:9 cinematic presentation illustration for Prezzer, in the SilkCircuit Neon brand. Color palette: near-black plum #12101a, glowing electric purple #e135ff and luminous mint cyan #80ffea, small coral-pink #ff6ac1 accents. This revision must be WHIMSICAL, charming, playful and wondrous, NOT technical or industrial. Think sophisticated magical realism, an art-house animated film rendered in exquisite luminous glass, soft silk, and starlight. Iridescent surfaces, translucent delicate materials, tactile detail, enchanting cinematic light, restrained bloom. NO text, letters, numbers, logos, watermarks, UI, robot faces, machinery, servers, mechanical equipment, cyberpunk weapons, or generic tech wallpaper. A quiet impossible ocean under a starry dark plum sky. Several tiny origami boats folded from iridescent violet glass drift on luminous mint-cyan ripples, each carrying a little glowing moon like a lantern. A delicate giant crescent moon low on the RIGHT horizon. The water and boats occupy the LOWER THIRD of the image, with empty very dark plum sky across the UPPER TWO THIRDS for a giant live headline and command line. Playful, hopeful, calm magical realism, cinematic wonder, beautiful silk-like water, no retro grid, no technology.
```
