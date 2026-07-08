// SEO guides. Each post is plain content rendered by app/blog/[slug]. Bodies are
// arrays of {h, p[]} sections so the page renders headings + paragraphs without
// a markdown dependency. Content is original, accurate and cites ASCE 7-22.
export interface PostSection { h?: string; p: string[] }
export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO; set from the build date of the product
  readMins: number;
  keyword: string;
  body: PostSection[];
}

const D = "2026-06-14";

export const POSTS: Post[] = [
  {
    slug: "how-to-calculate-roof-snow-load",
    title: "How to Calculate Roof Snow Load (ASCE 7-22, Step by Step)",
    description: "A plain-English walkthrough of the ASCE 7-22 roof snow load calculation: ground snow load, the flat-roof equation, the slope factor and the minimum load.",
    date: D, readMins: 7, keyword: "how to calculate roof snow load",
    body: [
      { p: ["Roof snow load is the design weight of snow your roof structure must carry. In the United States it is set by Chapter 7 of ASCE/SEI 7, the standard nearly every building code adopts. The good news: the core calculation is only a few steps, and this guide walks through each one."] },
      { h: "Step 1: Find your ground snow load (Pg)", p: ["Everything starts with the ground snow load, Pg, in pounds per square foot (psf). It is the weight of snow that accumulates on open ground at your site, and it is fixed by your location. Get it from the ASCE 7 Hazard Tool or your local building department; many jurisdictions publish an adopted county or town value. Our per-state pages give a planning range, but the permit value is the one your jurisdiction adopts."] },
      { h: "Step 2: Convert to the flat-roof load (Pf)", p: ["ASCE 7-22 Equation 7.3-1 converts ground snow to the flat-roof snow load: Pf = 0.7 × Ce × Ct × Is × Pg. The 0.7 base factor accounts for snow that blows or melts off a roof. Ce is the exposure factor (how wind-exposed the roof is), Ct is the thermal factor (how warm the roof is underneath), and Is is the importance factor (how critical the building is)."] },
      { h: "Step 3: Apply the slope factor (Cs) for a pitched roof", p: ["Sloped roofs shed snow, so multiply Pf by the slope factor Cs to get the sloped balanced load Ps = Cs × Pf. Cs is 1.0 up to a breakpoint slope and then decreases linearly to zero at 70°. Warm and slippery roofs shed sooner, so their breakpoint is lower."] },
      { h: "Step 4: Check the minimum and rain-on-snow", p: ["Low-slope roofs (under 15°) must also carry a minimum load: Is × Pg if Pg ≤ 20 psf, otherwise 20 × Is. And in mild-winter areas (Pg ≤ 20) a nearly flat roof gets a 5 psf rain-on-snow surcharge. Your design load is the largest governing case."] },
      { p: ["Plug your numbers into the RoofHelm calculator and it does all four steps and shows every factor. For gable, stepped and multi-level roofs, also check the unbalanced, drift and sliding cases, any of which can govern."] },
    ],
  },
  {
    slug: "ground-snow-load-explained",
    title: "Ground Snow Load Explained (and How to Find Yours)",
    description: "What ground snow load (Pg) means, why it varies so much by location and elevation, and exactly where to look up the value for your site.",
    date: D, readMins: 6, keyword: "ground snow load",
    body: [
      { p: ["Ground snow load, written Pg, is the weight of accumulated snow on open ground at a site, in pounds per square foot. It is the single biggest input to any roof snow calculation, and it varies enormously: from 0 psf across the Gulf Coast to well over 100 psf in the mountains."] },
      { h: "Why it varies so much", p: ["Snow load depends on climate and, crucially, elevation. Two towns in the same county can have very different ground snow loads if one sits a few thousand feet higher. That is why ASCE 7 marks mountainous regions as 'case study' zones, where a site-specific study is required rather than a single map value."] },
      { h: "Where to find your value", p: ["The authoritative source is the ASCE 7 Hazard Tool, which returns the ASCE 7-22 ground snow load for a specific latitude/longitude. Your local building department is equally valid and often easier. Many adopt a published county or town value in their code amendments, and that adopted number is what governs a permit."] },
      { h: "Ground vs roof snow load", p: ["Ground snow load is not what your roof carries. A normal heated, sheltered house carries roughly 60–70% of the ground value once the ASCE 7 factors are applied. Use the ground value as the starting point and convert it with the roof snow load calculator."] },
    ],
  },
  {
    slug: "ground-snow-load-by-state",
    title: "Ground Snow Load by State: A Reference Map",
    description: "Planning ranges for ground snow load across all 50 states, with the mountainous case-study states flagged. Always confirm the exact value with your AHJ.",
    date: D, readMins: 5, keyword: "snow load by state",
    body: [
      { p: ["Ground snow load is a local number, but it helps to know the ballpark for your state before you look up the exact site value. We publish a planning range for the populated parts of every state, read from the ASCE 7 ground snow load map and common code amendments."] },
      { h: "The big picture", p: ["The Gulf Coast and Southwest deserts are effectively zero. The mid-Atlantic and lower Midwest run 15–30 psf. The upper Midwest and New England run 30–70 psf, and the northern tier of New England and the mountain West can exceed 100 psf at elevation."] },
      { h: "Watch the case-study states", p: ["In mountainous states (Colorado, Utah, Wyoming, Montana, Idaho, California, Washington, Oregon, Alaska and others) elevation drives the value, not the state. A valley town might be 35 psf while a resort a few miles away at altitude is 150+. Those states are flagged as case-study, meaning you must get the site value from the Hazard Tool or your AHJ."] },
      { p: ["Pick your state from the RoofHelm state directory for its range, a pre-loaded calculator and the local guidance, then confirm the exact ground snow load for your address before you build."] },
    ],
  },
  {
    slug: "asce-7-22-snow-load-changes",
    title: "What Changed in ASCE 7-22 Snow Loads",
    description: "ASCE 7-22 reworked how ground snow load is determined and added reliability-targeted values. Here is what designers need to know.",
    date: D, readMins: 6, keyword: "asce 7-22 snow load",
    body: [
      { p: ["ASCE 7-22 is the 2022 edition of Minimum Design Loads and is being adopted through the 2024 IBC/IRC cycle. Its snow chapter (Chapter 7) kept the familiar equations but changed how the ground snow load is determined."] },
      { h: "Reliability-targeted ground snow loads", p: ["The biggest change is that ground snow loads are now reliability-targeted and delivered through the ASCE Hazard Tool database rather than a single printed map with case-study regions. The result is more site-specific values and, in some places, different numbers than ASCE 7-16 produced."] },
      { h: "The equations are familiar", p: ["The flat-roof equation Pf = 0.7 Ce Ct Is Pg, the slope factor Cs, the minimum-load rules and the drift formulas are all still here and broadly unchanged in form. If you know the 7-16 method, the 7-22 calculation will feel the same; it is mostly the Pg source that moved."] },
      { h: "What to do", p: ["Always pull the ground snow load from the Hazard Tool for the correct code edition your jurisdiction has adopted, and confirm which edition that is. Then run the standard calculation, which is exactly what RoofHelm implements."] },
    ],
  },
  {
    slug: "ground-snow-load-vs-roof-snow-load",
    title: "Ground Snow Load vs Roof Snow Load: The Difference",
    description: "Why roof snow load is usually less than ground snow load, and the exposure, thermal and importance factors that connect them.",
    date: D, readMins: 5, keyword: "ground snow load vs roof snow load",
    body: [
      { p: ["People often use 'snow load' to mean both the snow on the ground and the snow on the roof, but ASCE 7 treats them as two different numbers connected by a formula."] },
      { h: "Ground snow load", p: ["Pg is what accumulates on open ground. It is a fixed property of your location and the input to the whole calculation."] },
      { h: "Roof snow load", p: ["The flat-roof load Pf = 0.7 × Ce × Ct × Is × Pg is what the roof actually carries. The 0.7 factor reflects that wind and a little melting remove some snow from a roof compared to open ground. Exposure (Ce), warmth (Ct) and importance (Is) then adjust it up or down."] },
      { h: "So which is bigger?", p: ["On a normal heated, partially sheltered house the roof load is about 60–70% of the ground load. But a fully exposed, unheated or essential-facility roof can have factors that push the roof load close to the ground value, and occasionally above it. Always run the conversion rather than assuming."] },
    ],
  },
  {
    slug: "snow-drift-loads-on-roofs",
    title: "Snow Drift Loads on Roofs (ASCE 7 §7.7) Made Simple",
    description: "How snow drifts form at roof steps, parapets and walls, why they can be the governing load case, and how to size the drift surcharge.",
    date: D, readMins: 6, keyword: "snow drift load",
    body: [
      { p: ["Some of the worst roof snow failures are not from uniform snow. They come from drifts that pile up where wind dumps snow against a taller wall, parapet or rooftop unit. ASCE 7 §7.7 covers these drift surcharge loads, and they often govern the design of a lower roof."] },
      { h: "Where drifts form", p: ["A drift builds on a lower roof next to a taller upper roof (a roof step), against a parapet, or beside a long rooftop screen. Wind carries snow off the upper surface and deposits it in a triangular drift on the lee side."] },
      { h: "What sets the drift size", p: ["The leeward drift height depends on the ground snow load and the length of the upper roof feeding it: hd = 0.43 × (Lu)^(1/3) × (Pg + 10)^(1/4) − 1.5 ft. The snow density γ = 0.13 Pg + 14 (capped at 30 pcf) turns that height into a surcharge load pd = hd × γ, which sits on top of the balanced load."] },
      { h: "When you can skip it", p: ["If the clear height above the balanced snow is small relative to the balanced snow depth (hc/hb < 0.2), drift need not be considered. Otherwise, run it: our snow drift calculator does the full §7.7 check."] },
    ],
  },
  {
    slug: "how-much-does-snow-weigh",
    title: "How Much Does a Foot of Snow Weigh on a Roof?",
    description: "Snow weight depends on density, not just depth. Here is how to estimate roof snow weight and why a foot of wet snow can be 5× a foot of powder.",
    date: D, readMins: 5, keyword: "how much does snow weigh",
    body: [
      { p: ["A roof does not care how deep the snow is. It cares how much that snow weighs, and weight depends on density, which varies wildly between dry powder and wet, settled snow."] },
      { h: "Density is everything", p: ["Fresh powder can be as light as 3–5 pounds per cubic foot, while old, wet, compacted snow approaches 20–30 pcf. ASCE 7 estimates settled snow density as γ = 0.13 × Pg + 14 psf-per-foot, capped at 30 pcf, so higher ground snow loads come with denser snow."] },
      { h: "Turning depth into load", p: ["Multiply density by depth to get load. A foot of powder at 5 pcf is only 5 psf, but a foot of wet snow at 20 pcf is 20 psf. Two feet of dense snow plus a rain event can quickly approach many roofs' design capacity."] },
      { h: "Knowing your number", p: ["Use the calculator to get your design roof snow load in psf, then watch real accumulation. If you can estimate the depth and whether it is light or wet, you can judge when you are approaching the design value and whether removal is warranted."] },
    ],
  },
  {
    slug: "metal-roof-snow-load-guide",
    title: "Metal Roof & Steel Building Snow Load Guide",
    description: "Why metal roofs count as 'slippery surfaces' in ASCE 7, how that lowers the slope factor, and the sliding-snow hazard to plan for.",
    date: D, readMins: 5, keyword: "metal roof snow load",
    body: [
      { p: ["Metal roofs and steel buildings are everywhere in snow country because they shed snow well. ASCE 7 recognises that by classifying smooth metal as an unobstructed slippery surface, which changes the slope factor."] },
      { h: "Slippery means it sheds sooner", p: ["On a warm roof, a slippery surface's slope factor Cs starts reducing the load at just 5°, versus 30° for shingles. So a metal roof at a moderate pitch carries noticeably less balanced snow than an equivalent asphalt roof."] },
      { h: "Don't forget the thermal factor", p: ["Many steel buildings are unheated, so they use Ct = 1.2 rather than 1.0, which adds load and partly offsets the slippery benefit. Enter the real thermal condition, not an optimistic one."] },
      { h: "Sliding snow is the catch", p: ["A slippery roof dumps its snow somewhere. ASCE 7 §7.9 sliding-snow loads land on lower roofs, walkways and equipment below. Plan where the snow goes and keep entrances and lower roofs clear of the slide path."] },
    ],
  },
  {
    slug: "solar-panels-and-snow-load",
    title: "Do Solar Panels Add to Roof Snow Load?",
    description: "How rooftop solar interacts with snow load: added dead load, changed sliding behaviour, and what to check before installing.",
    date: D, readMins: 5, keyword: "solar panels snow load",
    body: [
      { p: ["Rooftop solar is booming in snowy states, and a common question is whether the panels add to the roof's snow load. The honest answer: panels mostly add dead load, but they also change how snow behaves on the roof."] },
      { h: "Dead load first", p: ["A typical rooftop array adds roughly 3–4 psf of dead load (panels plus racking). That is separate from snow load but stacks on top of it in the load combinations, so the structure must carry both."] },
      { h: "Panels change snow behaviour", p: ["Smooth panel glass is slippery and can shed snow faster than the surrounding roof, but the racking can also trap snow at the lower edge and create mini-drifts between rows. In heavy-snow regions, designers sometimes treat the array area carefully rather than assuming it sheds clean."] },
      { h: "What to check", p: ["Confirm the roof's existing snow load capacity, add the array dead load, and make sure the attachment points and rafters still work. Run your design roof snow load here first so you know the number the structure already has to meet."] },
    ],
  },
  {
    slug: "safe-snow-load-for-my-roof",
    title: "What Is a Safe Snow Load for My Roof?",
    description: "How to tell what your roof was designed to carry, warning signs of overload, and when to remove snow.",
    date: D, readMins: 6, keyword: "safe snow load for roof",
    body: [
      { p: ["After a big storm the question is simple: is my roof okay? The answer comes from comparing the snow actually on the roof to the load the roof was designed for."] },
      { h: "Find your design load", p: ["Your structural drawings or local building department list the design ground/roof snow load. If you don't have them, compute the ASCE 7 design load for your location and roof here as a reasonable benchmark, since most modern roofs are designed at least to the code value."] },
      { h: "Estimate what's up there", p: ["Estimate the snow depth and whether it is light powder or dense, wet, settled snow. Multiply depth by density (powder ~5 pcf, wet ~20 pcf) to get the current load in psf, then compare to the design value."] },
      { h: "Warning signs", p: ["Sagging ceilings, sticking doors, new cracks in drywall, and creaking are red flags. If the estimated load is approaching the design value or you see these signs, remove snow safely (rake from the ground) or call a professional. Never get on a loaded roof."] },
    ],
  },
  {
    slug: "exposure-thermal-importance-factors",
    title: "Snow Load Factors: Exposure, Thermal and Importance Explained",
    description: "Plain-English definitions of Ce, Ct and Is, the three ASCE 7 factors that turn ground snow load into roof snow load.",
    date: D, readMins: 6, keyword: "snow load exposure factor",
    body: [
      { p: ["The flat-roof equation Pf = 0.7 Ce Ct Is Pg has three factors that trip people up. Here is what each one means and how to choose it."] },
      { h: "Exposure factor, Ce", p: ["Ce reflects how wind-exposed the roof is. A roof in open, windswept terrain loses snow to wind (Ce as low as 0.7–0.9); a roof sheltered by trees or taller buildings keeps it (Ce up to 1.2). It combines the surrounding terrain category (B, C, D) with the roof's own exposure."] },
      { h: "Thermal factor, Ct", p: ["Ct reflects how much heat escapes through the roof to melt snow from below. A continuously heated building is 1.0; a cold ventilated or barely heated roof is 1.1; an unheated structure is 1.2; a freezer is 1.3; and a continuously heated greenhouse gets 0.85."] },
      { h: "Importance factor, Is", p: ["Is scales the load by how critical the building is (Risk Category). Ordinary buildings are 1.0; low-hazard structures like minor sheds are 0.8; substantial-hazard buildings are 1.1; and essential facilities like hospitals are 1.2."] },
      { p: ["Get these three right and the rest of the calculation follows. The calculator lets you set each one and shows the value it used."] },
    ],
  },
  {
    slug: "flat-roof-snow-problems",
    title: "Why Flat Roofs Are Hardest on Snow",
    description: "Flat roofs carry the full snow load with no shedding, plus rain-on-snow and ponding risk. What to watch for and how to design.",
    date: D, readMins: 5, keyword: "flat roof snow load",
    body: [
      { p: ["Flat and low-slope roofs are the toughest case for snow because they get no help from gravity (nothing slides off), and they invite a couple of extra load cases."] },
      { h: "No slope shedding", p: ["With essentially no slope, the slope factor Cs is 1.0, so the roof carries the full flat-roof load Pf. There is no reduction for shedding the way a steep roof gets."] },
      { h: "Rain-on-snow and the minimum", p: ["In mild-winter areas (Pg ≤ 20 psf) a low-slope roof picks up a 5 psf rain-on-snow surcharge, because rain soaks into snow that can't drain. Low-slope roofs also must meet the §7.3.4 minimum load, which can govern in light-snow regions."] },
      { h: "Drainage and ponding", p: ["Beyond snow, a flat roof must drain meltwater. Blocked drains plus melting snow lead to ponding, which adds weight and can spiral. Keep drains and scuppers clear through winter, and design positive drainage."] },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

const WEEK2_POSTS: Post[] = [
  {
    slug: "how-much-snow-can-my-roof-hold",
    title: "How Much Snow Can My Roof Hold?",
    description: "Most code-built roofs handle 20-40 psf. Here's how to estimate what's on your roof, how to find your design limit, and when to remove snow.",
    date: "2026-06-20", readMins: 6, keyword: "how much snow can a roof hold",
    body: [
      { p: ["The short answer: most modern code-built homes in the US are designed to carry between 20 and 40 pounds per square foot (psf) of roof snow load, depending on location. Whether the snow on your roof right now is within that limit depends on two things: how much it weighs, and what your roof was built to handle."] },
      { h: "Find your design snow load", p: ["The design snow load is set by your local building code, based on your ground snow load and ASCE 7. Your building permit or structural drawings will state the design value. If you don't have those, our calculator estimates the ASCE 7 code value for your location. A typical single-family house in the Northeast is designed for 30–40 psf; in the Midwest, 20–30 psf; in mild climates, as little as 10–15 psf."] },
      { h: "Estimate the snow on your roof now", p: ["Measure snow depth on the roof (or on a flat surface nearby as a proxy). Then estimate density: fresh powder is roughly 5 pcf, settled snow is 10–15 pcf, and wet, compacted snow after a warm spell can reach 20–25 pcf. Multiply depth (feet) by density to get the current load in psf."] },
      { h: "Warning signs of too much load", p: ["Sticking interior doors and windows, sagging ceiling drywall, new cracks at door corners, and audible creaking or popping are all signs the structure is under stress. If you see any of these after a heavy snow, take them seriously and consider snow removal or a professional inspection."] },
      { h: "When to remove snow", p: ["If your estimated load approaches 75% of the design value, or if you see structural warning signs, start raking. Use a roof rake from the ground; do not climb onto a snow-loaded roof. Focus on getting 2–4 feet of snow off the eave edge; you don't need to clear the whole roof. Clear one section at a time to avoid uneven loading." ] },
    ],
  },
  {
    slug: "roof-snow-removal-when-and-how",
    title: "Roof Snow Removal: When and How to Rake",
    description: "When roof snow load approaches the design limit, raking is safer than waiting. Here's how to judge the risk and remove snow without getting on the roof.",
    date: "2026-06-20", readMins: 6, keyword: "roof snow removal",
    body: [
      { p: ["Removing snow from a residential roof is not always necessary, but after a major storm, especially in regions where roofs are not designed for heavy loads, it can prevent a collapse. The key is knowing when the load is actually dangerous and how to remove it safely."] },
      { h: "When should you remove roof snow?", p: ["Remove snow when: (1) your estimated current load exceeds 75% of your design snow load; (2) snow has accumulated over several storms without melting between them; (3) the snow is heavy and wet, not light powder; or (4) you see structural warning signs like sticking doors, cracked drywall or sagging ceilings."] },
      { h: "Never get on the roof", p: ["A snow-loaded roof is the worst possible time to climb up. The snow compresses unevenly, and a slip in winter conditions is extremely dangerous. All roof snow removal for homeowners should be done with a roof rake from the ground."] },
      { h: "How to use a roof rake", p: ["A roof rake is an aluminium or plastic blade on a long telescoping handle, usually 12–21 feet. Position yourself well away from the eave edge so that snow falling off the roof doesn't land on you. Pull snow down the slope in strips; don't drag it horizontally. Clear 2–4 feet up from the eave as a priority: removing the lower section takes the most weight off the eave where ice dams form and where structural stress concentrates."] },
      { h: "Hire a professional for steep or large roofs", p: ["For steep slopes, multi-story buildings or very heavy accumulation, hire a licensed roofing professional with fall-protection equipment and snow-removal experience. Costs vary by region and roof size."] },
      { h: "After removal", p: ["After clearing, run the load calculation again with the reduced estimated depth to confirm you're back within the safe zone. Monitor for the next storm and consider whether your roof needs a professional structural assessment if it has seen repeated near-limit loading."] },
    ],
  },
  {
    slug: "roof-collapse-warning-signs",
    title: "Warning Signs of Roof Overload from Snow",
    description: "Sticking doors, sagging ceilings and cracking drywall all signal roof stress. Here's how to read the warning signs before snow overload becomes a collapse.",
    date: "2026-06-20", readMins: 5, keyword: "roof collapse from snow",
    body: [
      { p: ["A roof collapse rarely happens without warning. In the hours and days before failure, the structure sends signals you can see and hear. Knowing them can save lives and prevent a catastrophic loss."] },
      { h: "Visual warning signs", p: ["Sagging or bowing ceiling panels, especially in the centre of a large room, indicate deflection under load. New cracks in drywall, particularly diagonal cracks at the corners of doors and windows, signal that the structure above is distorting. Visibly bent or bowed roof rafters or trusses seen from the attic are a serious warning."] },
      { h: "Operational warning signs", p: ["Interior doors and windows that suddenly stick, won't close fully, or pop open on their own are reacting to the building racking under load. This is often one of the first signs homeowners notice. Sticking typically occurs at the top corners of door frames as the structure above deflects."] },
      { h: "Sounds to listen for", p: ["Creaking, popping and cracking sounds from the ceiling or attic during or after a heavy snow event are the structure speaking. Occasional thermal movement is normal, but persistent or loud sounds under static snow load are a warning. A single loud crack is a more urgent sign."] },
      { h: "What to do", p: ["If you notice any of these signs: move people and pets out of rooms below the stressed area. Do not attempt to get on the roof yourself. Call a structural engineer or licensed contractor immediately. While waiting, you may be able to carefully shovel snow off the eave from the ground using a roof rake. Do not enter the attic to investigate if the sounds are ongoing."] },
      { h: "Don't wait until spring to inspect", p: ["After every heavy-snow winter, have your attic framing checked for permanent deflection or connection damage. Even if the structure survives the load event, cumulative fatigue can leave it weaker the following year."] },
    ],
  },
  {
    slug: "roof-snow-load-by-zip-code",
    title: "Find Your Roof Snow Load by ZIP Code",
    description: "Your zip code determines your ground snow load. Here's how to look it up, what it means, and how to turn it into a roof design load using ASCE 7.",
    date: "2026-06-20", readMins: 5, keyword: "roof snow load by zip code",
    body: [
      { p: ["Your ZIP code is the starting point for finding your snow load, but the calculation does not end there. Here's the full path from ZIP code to design roof load."] },
      { h: "Step 1: Ground snow load for your location", p: ["The ground snow load Pg is the weight of snow that accumulates at a site, in psf. It is set by ASCE 7 and varies by location: not just by ZIP code, but by precise latitude/longitude and sometimes elevation within a ZIP code. The authoritative source is the ASCE 7 Hazard Tool, which accepts a lat/lon or address. Your local building department also publishes a jurisdiction-adopted value, which may differ slightly from the ASCE map."] },
      { h: "Step 2: Convert to a roof snow load", p: ["The roof does not carry as much as the ground, because wind and a little heat remove some snow. ASCE 7 Equation 7.3-1 converts ground snow load to flat-roof snow load: Pf = 0.7 × Ce × Ct × Is × Pg. The factors (exposure, thermal and importance) depend on your specific roof and building type, not just location."] },
      { h: "Using RoofHelm", p: ["Enter your ground snow load (from your building department or the ASCE 7 Hazard Tool for your address), then select your exposure condition, thermal category and risk category. The calculator applies the equation and shows the flat-roof load, slope reduction and, if you enter a step or drift geometry, the drift surcharge."] },
      { h: "Why it can't be one-click by ZIP", p: ["A single ZIP code can span multiple elevations, terrain exposures and roof types. Two houses on the same street with different pitch, thermal conditions and surroundings will have different design loads. The ZIP code gives you Pg; the full calculation gives you the number that governs your roof."] },
    ],
  },
  {
    slug: "ice-dam-formation-and-prevention",
    title: "Ice Dams: Causes, Prevention and Snow Load",
    description: "Ice dams form when heat escapes through the roof and melts snow that refreezes at the cold eave. Here's how they form, what they cost, and how to prevent them.",
    date: "2026-06-20", readMins: 7, keyword: "ice dam prevention",
    body: [
      { p: ["Ice dams are a common winter roofing problem in cold climates. They form at the eave edge of a roof when the conditions are right, and they can cause serious interior water damage even when the outdoor temperature is well below freezing."] },
      { h: "How ice dams form", p: ["Heat escaping through the roof warms the roof deck above the insulated living space. Snow on that warm section melts and flows down the slope. When it reaches the cold eave overhang (which hangs over unconditioned space and stays below freezing), it refreezes. Over successive melt-freeze cycles, the ice builds up into a dam. Water behind the dam backs up under shingles and leaks into the attic and ceiling."] },
      { h: "The root cause is heat loss, not just snow", p: ["Ice dams are primarily an insulation and air-sealing problem, not a roofing problem. Any warm interior air that leaks into the attic through electrical boxes, light fixtures, plumbing penetrations or attic hatches heats the roof deck unevenly and creates melting even when ambient temperatures are very cold."] },
      { h: "Prevention: seal and insulate", p: ["The most effective prevention is to air-seal all attic bypasses and add enough insulation to keep the entire roof deck cold, so no melting occurs. Most building codes recommend a minimum R-value for attic floors in cold climates; check your local energy code for the requirement in your climate zone. A cold, uniformly cold roof prevents the uneven melting that creates ice."] },
      { h: "Ice-and-water barrier at the eave", p: ["Most codes require a self-adhering ice-and-water barrier membrane at the eave, typically extending a minimum distance up the roof past the interior wall line. This membrane is a second line of defence if an ice dam does form: it prevents the backed-up water from penetrating the roof deck."] },
      { h: "Relationship to snow load", p: ["Ice adds significant weight to a roof eave, especially when a large dam builds up over a long winter. A thick ice dam across the full eave can weigh several hundred pounds per linear foot, a concentrated load on the structure directly above the exterior wall. In severe winters, this concentrated load adds to the design snow load and should be considered when assessing overall roof safety."] },
      { h: "Short-term remedies", p: ["Roof rakes remove snow before it can melt and refreeze. Calcium chloride ice-melt cables along the eave create a drainage channel. Neither is a permanent fix; the permanent fix is insulation and air sealing."] },
    ],
  },
  {
    slug: "unbalanced-snow-load-gable-roofs",
    title: "Unbalanced Snow Load on Gable Roofs",
    description: "Unbalanced snow load governs gable roofs when wind piles snow on one side. ASCE 7 §7.6 requires a check; here's how to calculate the design case.",
    date: "2026-06-20", readMins: 6, keyword: "unbalanced snow load",
    body: [
      { p: ["When wind blows across a gable roof, it scours snow off the windward side and deposits it on the leeward side. The result is a roof carrying unequal loads: one side lightened, the other loaded above the balanced value. ASCE 7 §7.6 requires an unbalanced check for gable and hip roofs above a minimum slope threshold."] },
      { h: "When ASCE 7 requires an unbalanced check", p: ["An unbalanced snow load check is required for gable roofs with a slope between 2.38° (1/2:12) and 30.2° (7:12). Slopes below that range are essentially flat and treated differently; slopes above 30.2° are steep enough that wind loading matters but the balanced load is already low from Cs."] },
      { h: "The unbalanced load distribution", p: ["On the windward side, ASCE 7 allows a reduced load of 0.3 × Pf. On the leeward side, the load increases above Pf. For a symmetric gable the leeward load is Pf + 0.3 × Pf = 1.3 × Pf on the leeward slope projection. The ridge still carries the full balanced load. This asymmetric load creates asymmetric bending in the ridgeboard, purlins and ridge beam that the balanced case does not produce."] },
      { h: "Why it matters for design", p: ["Many roof framing members, particularly ridgeboards in older construction that rely on ridge support rather than collar ties or ridge beams, can be overstressed by an unbalanced case that would not cause failure under a balanced load. An unbalanced snow event in 2010 caused hundreds of roof collapses in New England, many of them on roofs that were within their balanced-load capacity."] },
      { h: "Running the check", p: ["RoofHelm's unbalanced load calculator takes your Pf, roof slope and half-span and returns the design leeward and windward loads for the §7.6 case. Check your ridge and purlin members against these numbers in addition to the balanced case."] },
    ],
  },
  {
    slug: "snow-load-calculation-worked-examples",
    title: "Snow Load Calculation: Worked Examples",
    description: "Three worked examples of the ASCE 7-22 flat-roof snow load equation -- standard house, unheated garage and an exposed warehouse -- with all factors shown.",
    date: "2026-06-20", readMins: 7, keyword: "snow load calculation examples",
    body: [
      { p: ["The ASCE 7-22 flat-roof snow load equation (Pf = 0.7 × Ce × Ct × Is × Pg) is straightforward once you know how to choose each factor. Here are three worked examples at different building types."] },
      { h: "Example 1: Typical suburban house in Rochester, NY", p: ["Ground snow load Pg: 55 psf (Rochester, Upstate NY). Ce = 1.0 (partially exposed, suburban terrain B). Ct = 1.0 (continuously heated). Is = 1.0 (Risk Category II, ordinary occupancy). Pf = 0.7 × 1.0 × 1.0 × 1.0 × 55 = 38.5 psf. For a 6:12 slope (26.6°), the slope factor Cs for a warm roof (non-slippery) = 1.0 up to 30°, so balanced sloped load Ps = 38.5 psf."] },
      { h: "Example 2: Unheated detached garage, suburban", p: ["Same Rochester Pg = 55 psf. Ce = 1.0. Ct = 1.2 (unheated structure). Is = 0.8 (Risk Category I, minor storage, low-hazard). Pf = 0.7 × 1.0 × 1.2 × 0.8 × 55 = 36.96 psf. The Ct increase for being cold offsets the Is reduction, and the result is close to the house load. Check the minimum: Is × Pg = 0.8 × 55 = 44 psf; the minimum governs. Design load = 44 psf."] },
      { h: "Example 3: Fully exposed warehouse in open terrain", p: ["Location: Boise, ID, Pg = 35 psf. Ce = 0.8 (fully exposed roof, open terrain Category C with no obstruction). Ct = 1.1 (partially conditioned warehouse, maintained above freezing but not heated to normal interior temperatures). Is = 1.0. Pf = 0.7 × 0.8 × 1.1 × 1.0 × 35 = 21.56 psf. Check minimum: Is × Pg = 35 psf; minimum does NOT govern here since Pg > 20. Design flat-roof load = 21.56 psf, reduced from the 35 psf ground value by exposure."] },
      { h: "Key takeaways", p: ["The thermal factor matters most for unheated and cold buildings: Ct = 1.2 adds 20% load. Exposure matters most for fully open industrial buildings in Category C terrain: Ce = 0.8 reduces load 20%. The minimum load check (Is × Pg) often governs for unheated low-importance buildings in heavy-snow regions. Always run both the formula result and the minimum and take the larger."] },
    ],
  },
  {
    slug: "sliding-snow-loads-asce-7",
    title: "Sliding Snow Loads (ASCE 7 §7.9) Explained",
    description: "When a slippery roof sheds snow, the mass lands on the lower roof or walkway below. ASCE 7 §7.9 sizing for sliding snow surcharge, explained step by step.",
    date: "2026-06-20", readMins: 6, keyword: "sliding snow loads on roofs",
    body: [
      { p: ["Metal roofs, glazed surfaces and some steep asphalt roofs shed snow rapidly in a warming event. When that snow slides off the upper roof, it lands as a concentrated surcharge on whatever is below: a lower roof, a covered walkway, a sunroom addition, or parked vehicles. ASCE 7 §7.9 requires a check for this load case."] },
      { h: "When §7.9 applies", p: ["A sliding snow check is required when a slippery roof (smooth metal, membrane, glass) is adjacent to a lower-level roof, a porch roof, or any structure in the path of sliding snow. The upper roof must have enough slope to actually shed snow, generally steeper than 2:12 on a slippery surface."] },
      { h: "Calculating the sliding surcharge", p: ["The sliding load is the weight of snow that could slide off the upper roof onto the lower structure. ASCE 7 §7.9 sizes it as: sliding surcharge = Pf (upper roof) × lu × (width of lower roof slope receiving the snow). The surcharge is distributed over a distance of 15 ft measured from the eave of the upper roof. If the lower roof is narrower than 15 ft, all the snow lands on the actual width."] },
      { h: "Combined load on the lower roof", p: ["The lower roof must be designed for its own balanced snow load PLUS the sliding surcharge. The two loads do not cancel each other: the lower roof supports the worst case of its own accumulated snow plus what slides off the upper roof in a melt event."] },
      { h: "Design implications", p: ["For new construction, place covered entrances, walkways and secondary roofs outside the slide path of upper slippery roofs. For existing buildings, post warning signs in the slide path and consider snow guards on the upper roof to control or prevent sliding. Snow guards redistribute rather than prevent shedding; they reduce the sliding surcharge but do not eliminate it in a major melt event."] },
    ],
  },
  {
    slug: "estimate-roof-snow-weight-after-storm",
    title: "How to Estimate Your Roof's Current Snow Weight",
    description: "After a storm you want to know if the snow sitting on your roof is within design limits. Here's how to estimate the load from depth and snow density.",
    date: "2026-06-20", readMins: 5, keyword: "roof snow weight",
    body: [
      { p: ["You don't need a scale to estimate how much snow your roof is carrying. Two measurements and a density lookup give you a reasonable psf number you can compare to the design load."] },
      { h: "Measure snow depth", p: ["Measure snow depth on a flat, open surface near your home; a deck table or garden table works well as a snow board. This proxies what is on the roof; the actual roof depth may differ if the roof is warmer (melts from below) or if wind has redistributed snow."] },
      { h: "Estimate density by snow type", p: ["Fresh powder: 3–5 pcf. Light settled snow (1–3 days old): 6–9 pcf. Dense older snow (4+ days, warmed): 10–15 pcf. Wet, heavy snow (near freezing, compacted): 18–25 pcf. Use 12 pcf as a general middle-ground for mixed snow from a typical storm."] },
      { h: "Calculate the load", p: ["Load (psf) = depth (feet) × density (pcf). Example: 18 inches (1.5 ft) of dense snow at 15 pcf = 22.5 psf. At 25 pcf (very wet) it is 37.5 psf, well into the danger zone for roofs designed for lighter loads."] },
      { h: "Compare to your design load", p: ["The design roof snow load for your location from ASCE 7 (which you can calculate here) is the code limit. If your estimate approaches that number, consider snow removal. If it already exceeds it, remove snow immediately and watch for structural warning signs."] },
      { h: "Account for layering", p: ["After multiple storms without melting between them, the roof may carry several distinct layers with different densities. Estimate each layer separately and add them. A week of repeated storms can accumulate 3–4 layers, and the base may have been compacted to 20+ pcf while the top is fresh powder."] },
    ],
  },
  {
    slug: "shed-garage-snow-load",
    title: "Shed and Garage Snow Load: What to Know",
    description: "Sheds and detached garages often have minimal roof structure. Here's the ASCE 7 process for finding the design snow load for outbuildings and light framing.",
    date: "2026-06-20", readMins: 5, keyword: "shed roof snow load",
    body: [
      { p: ["Sheds and detached garages are often built with minimal roof framing: lightweight trusses, spaced 24 inches on centre, with thin roof decking. In heavy-snow regions, these outbuildings can be at more risk than the main house."] },
      { h: "Risk Category I lowers the load, but does not remove it", p: ["ASCE 7 classifies sheds and minor storage buildings as Risk Category I, which gives an importance factor Is = 0.8. That reduces the design load by 20% compared to a house. But in a high-snow area, even 80% of the full design load can exceed the capacity of light framing."] },
      { h: "The unheated factor adds load", p: ["A shed has no heat, so the thermal factor Ct = 1.2. This adds 20% load, which largely offsets the Risk Category I reduction. For an unheated shed in a heavy-snow region: Pf = 0.7 × Ce × 1.2 × 0.8 × Pg. The 1.2 and 0.8 nearly cancel, leaving you close to a standard residential design load."] },
      { h: "Common failure modes", p: ["Sheds fail in snow because: (1) the framing was undersized for the actual ground snow load in that location; (2) snow accumulates against a taller adjacent structure and creates a drift over the shed; (3) the owner treats it as unimportant and never rakes it. All three are avoidable."] },
      { h: "What to do before the season", p: ["Calculate the design snow load for your ground Pg and your shed's thermal and exposure conditions. Verify your framing span against a span table for the tributary area and roof load. If the numbers don't work, add a mid-span interior post or a collar tie to stiffen the framing. Rake sheds after every major snow event."] },
    ],
  },
  {
    slug: "snow-load-for-decks-balconies",
    title: "Snow Load for Decks and Outdoor Structures",
    description: "Decks, balconies and open porches must carry snow just like any roof structure. Here's how to find and apply the design snow load for outdoor platforms.",
    date: "2026-06-20", readMins: 5, keyword: "snow load for deck",
    body: [
      { p: ["Decks, balconies and open porches are outdoor structures exposed to snow accumulation. They do not have a roof to protect them; they accumulate the full ground snow load (or close to it), and their framing must be designed accordingly."] },
      { h: "Are decks designed for snow?", p: ["Most modern building codes require residential decks to carry a minimum live load of 40 psf for decks intended for occupancy. In high-snow regions, the design snow load can exceed 40 psf, in which case the snow load governs. A deck in Rochester, NY with a design roof snow load of 38 psf would typically be framed to a higher standard than the minimum 40 psf live load, but they are close."] },
      { h: "Ground load vs roof load for an open deck", p: ["A deck is not a roof. It has no exposure factor reduction (no sheltering) and no thermal factor (no heat below it). In practice the design snow load for an open deck is often taken directly as the ground snow load Pg, or a simplified fraction of it per the adopted code. Check with your local building department for the design value they require for decks."] },
      { h: "Critical spots: columns and connection points", p: ["The most common deck failure under snow is at the connection between the deck ledger board and the house band joist, or at post-to-beam connections. These are designed for the tributary area of deck they support; a large deck with a long snow-load season multiplies the stress on every connection."] },
      { h: "What about covered porches?", p: ["A porch with a solid roof is treated as a roof structure and follows the full ASCE 7 snow load calculation with Ce, Ct and Is. An open pergola or lattice cover allows snow to pass through and is generally designed like an open deck. A partially covered structure (e.g. spaced-slat pergola with 50% coverage) requires engineering judgement; check with your local AHJ."] },
    ],
  },
  {
    slug: "designing-roofs-for-high-snow-loads",
    title: "Designing Roofs for High Snow Loads",
    description: "High-snow regions require roof designs that account for drift, unbalanced and sliding loads in addition to the uniform load. Here's a design checklist.",
    date: "2026-06-20", readMins: 6, keyword: "roof design for snow",
    body: [
      { p: ["In areas with ground snow loads of 40 psf and above, the uniform balanced load is only the starting point. A complete snow load design must also address drifts, unbalanced load, sliding, and the minimum load, any one of which can govern the framing of a specific element."] },
      { h: "Start with the ground snow load", p: ["Pull Pg from the ASCE 7 Hazard Tool for your site's lat/lon. Confirm with the local building department whether they have adopted a different value. Use the local adopted value wherever one exists; the Hazard Tool is not the final word if your jurisdiction has passed an amendment."] },
      { h: "Compute all applicable load cases", p: ["ASCE 7 Chapter 7 requires separate checks for: (1) balanced flat-roof load Pf; (2) sloped/pitched load Ps after Cs reduction; (3) drift load at roof steps, parapets and walls (§7.7); (4) sliding load on lower roofs from adjacent slippery upper roofs (§7.9); (5) unbalanced load on gable roofs (§7.6); and (6) the minimum load (§7.3.4). Identify which cases apply to each structural element and design to the worst."] },
      { h: "Roof geometry choices in heavy-snow regions", p: ["A steeper slope reduces the balanced load via Cs but increases the potential for sliding and unbalanced load. Avoid complex multi-level roofs with many step transitions; each step is a drift source. Simple gable or hip roofs with consistent slope minimise drift exposure. Open terrain exposure reduces the balanced load (Ce as low as 0.7) but increases the potential for wind-blown drifting in unprotected areas."] },
      { h: "Connection design matters as much as the framing", p: ["Roof collapses in high-snow events often fail at connections: ridge-to-rafter, rafter-to-wall top plate, and wall top-plate-to-stud. Use engineered connector plates at every connection for critical load paths. Verify that stud walls can transfer the vertical and lateral loads from the roof snow load to the foundation."] },
      { h: "Maintenance is part of the design strategy", p: ["In regions with Pg > 50 psf, include a maintenance plan with the building design: specify roof access points for safe snow removal, confirm rake coverage from the ground, and plan for an annual post-season inspection of framing and connections. Well-designed buildings still need monitoring in extreme winters."] },
    ],
  },
];

POSTS.push(...WEEK2_POSTS);
