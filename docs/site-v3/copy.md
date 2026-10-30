# Site v3 copy deck

One `## <section-id>` per landing page section, in page order, then `meta`, `nav`, `footer`, `llms`. Voice: Collin coaching one person. No em dashes, no hype words, sentence case headlines, GroundApp (one word), Bodie. Every fact traces to a numbered source in "Sources" at the bottom, shown as [S1] style tags in the "Source" lines (tags are for the builder, never on the page).

Notation: **H1/H2** headline, **Lede** one line under it, **Body** paragraphs, **Button** label, **Alt** alt text, **Caption** visible caption, **Label** small UI text. "Link" is where a button goes. Media names match `~/dev/groundapp-website-assets-v3/` file names.

---

## meta

**Title (<title>):** GroundApp | Breathe with Bodie

**Meta description:** Breathwork app by Collin Chartier. Check in with Bodie and get the right breath for how you feel. Free to download. Premium $39.99/year.

**OG title / Twitter title:** GroundApp | Breathe with Bodie

**OG description / Twitter description:** Meet Bodie, your breathing companion. Check in, get the right breath for how you feel, and start free on iPhone and Apple Watch. Premium $39.99/year.

**OG and Twitter image alt:** GroundApp, breathwork by Collin Chartier

**Page `apple-itunes-app` / canonical:** unchanged.

**JSON-LD WebSite description:** GroundApp is a breathwork app for iPhone and Apple Watch by performance breathwork coach Collin Chartier.

**JSON-LD Person jobTitle:** Performance breathwork coach

**JSON-LD Person url:** https://groundapp.live/#story

**JSON-LD SoftwareApplication description:** Breathwork app by Collin Chartier. Meet Bodie, your breathing companion. More than 40 breathing techniques, a check-in that matches breathwork to how you feel, Advanced O2 and CO2 tables, guided sessions in Collin's voice, and live heart rate. Free to download. GroundApp Premium is $39.99 a year in the US and adds all techniques, the Advanced tables, guided sessions and Aura.

**JSON-LD featureList (one string per line):**
- More than 40 breathing techniques, each with a practice guide
- Check in with Bodie: name how you feel and get breathwork matched to it
- Advanced O2 and CO2 tables for breath-hold training (dry land only)
- Guided sessions in Collin's voice, with ambient sound and haptic cues (Premium)
- Aura, Collin's AI expert in nervous system regulation, builds a plan (Premium)
- Live heart rate and HRV from a Bluetooth heart rate monitor or a Whoop or Garmin broadcasting heart rate
- Apple Health, plus Whoop, Garmin, Oura and COROS through Apple Health
- Apple Watch app
- Streaks, session history and a BOLT score over time
- 4 core techniques, the session timer, streaks and basic stats are free

**JSON-LD FAQPage:** use the FAQ answers below as plain text (drop the link markup; the privacy answer ends "read our privacy policy").

Source: [S1] [S2] [S3] [S6]

---

## nav

Order: App, Story, Pricing, Play, App Store button.

| Label | Link |
|---|---|
| App | #check-in |
| Story | #story |
| Pricing | #pricing |
| Play | /play |
| Get the app | App Store link, `ct=site-nav` (button) |

**Brand link aria-label:** GroundApp home
**Nav aria-label:** Main
**Menu button (phone), closed / open label:** Open menu / Close menu
**Sticky phone bar:** GroundApp. Free to download. / Button: Get the app

Source: plan "Section ids" [S7]; current site nav and sticky bar [S4]

---

## hero

**H1:** Breathe with Bodie.

**Lede:** Meet Bodie, your breathing companion. Check in, and GroundApp picks the breath that fits how you feel.

**Interaction hint (under Bodie):** Press and hold Bodie to breathe in. Let go to breathe out.

**Hint, touch screens:** Touch and hold Bodie to breathe with him.

**Phase words (on the glow, the app's own wording):** Breathe in / Hold / Breathe out

**Buttons:**
- Download on the App Store (primary, `ct=site-hero`)
- Play Bodie's Breath Run (secondary, link /play)

**Meta line:** Free to download on iPhone and Apple Watch. Premium $39.99/year. Rated 5.0 on the App Store.

**Canvas aria-label:** Bodie, GroundApp's breathing companion, sitting on his cushion. Press and hold to breathe in, let go to breathe out.

**Reduced motion / Low Power note (visible, small):** Bodie is holding still because your device asked for less motion.

**Scroll cue (aria-label only):** Scroll to meet Collin

Source: [S1] [S3] [S4] (hold-to-breathe is the app's own gesture, S1: "press and hold on Bodie, then breathe with him")

---

## collin

**H2:** Hi, I'm Collin.

**Body:**
I created and developed GroundApp. I'm a performance breathwork coach.

I spent my twenties as a pro triathlete. I won an IRONMAN and the PTO US Open and raced for Team USA. In the summer of 2026 I ran 2,000 miles from Boulder to the Lincoln Memorial for the Herren Project.

**Film intro line (above the film button):** Three minutes on why I made GroundApp and how to use it.

**Buttons:**
- Watch my intro (plays the film with sound, on tap only)
- My story (link #story)

**Press line label:** As seen on

**Press names (plain text, no logos, no links except as noted):** NBC Washington, FOX 5 DC, ABC7, The Washington Times, Colorado's CW2, Triathlete, The New York Times

**Alt, photo 1 (collin-ironman-win):** Collin breaking the finish tape at IRONMAN Mont-Tremblant in 2022, arms raised, mouth open mid-yell.

**Alt, photo 2 (collin-run-home):** Collin from behind, in a white hood and running vest, running down a country road toward a tractor.

**Caption, photo 1:** 2022, IRONMAN Mont-Tremblant
**Caption, photo 2:** 2026, Running Home

**Film poster alt (intro-poster):** Collin talking to the camera in a cream collared shirt, at the start of his three-minute GroundApp intro film.

**Film player labels:** Play intro film / Pause intro film / Sound on / Sound off
**Film note:** Captions are on. The film has sound once you press play.

Source: [S5] [S6] [S8] (line 1 is the plan's wording, S7; intro film length and purpose from S1/S2)

---

## check-in

**H2:** Check in with Bodie.

**Lede:** Tell him how you feel. He finds the breath.

**Body:**
Tap Check in on Home. Name how you feel, then rate how strong it is and how much energy you have. GroundApp maps that to a nervous system state and matches breathwork to it.

Anxious and wired gets something different from flat and foggy.

**Steps (a real sequence, numbered 1 to 3):**
1. Name how you feel.
2. Rate how strong it is, and your energy.
3. Get a plan built for that state.

**Plan caption:** Your plan comes with a note on why each technique fits.

**Small print:** This plan is built on your phone. (A line in the app. Keep as the screenshot's own wording.)

**Button:** Download and check in (App Store, `ct=site-checkin`)

**Alt, clip ch06-check-in:** The check-in in GroundApp. Bodie sits in the corner asking how you're feeling. You pick a feeling, narrow it down, rate how strong it is and your energy, then tap Save check-in.

**Alt, screenshot 04-check-in:** GroundApp check-in screen. Bodie on his disc asks "How are you feeling right now?" with six choices: Calm, Anxious, Sad, Angry, Energized and Numb.

**Alt, screenshot 05-check-in-plan:** A plan from a check-in titled "Your session, 4 minutes": Physiological sigh, 4-7-8 breathing and Resonance breathing, each with a line on why, and a Begin session button.

**Alt, screenshot 02-home:** GroundApp Home in the evening. A cloud asks "How are you feeling this evening?" with a Check in button. Bodie sits below, with Resonance picked on the wheel and a Start button.

Source: [S1] [S9: screenshots 02, 04, 05, clip ch06]

---

## library

**H2:** More than 40 ways to breathe.

**Lede:** Every one has a practice guide: what it's for, the steps, how long it takes, and safety.

**Body:**
Scroll the wheel on Home to pick a technique, tap Start, or press and hold on Bodie and breathe with him. Four core techniques are free. Premium opens the rest.

**Technique picker label:** Tap one. Bodie breathes it.

**Techniques (real names, as the app lists them):**
| Name | Line under it |
|---|---|
| Box breathing | 4-4-4-4, a 16-second breath. Free. |
| 4-7-8 breathing | 4-7-8, a 19-second breath. |
| Energizing breath | 2-2, a 4-second breath. |
| Physiological sigh | Two short inhales, one long exhale. |
| 2-to-1 breathing | 4-8, a 12-second breath. Free. |
| Alternate nostril | Breathe through one nostril at a time. |
| Resonance breathing | Even in, even out. |

(The four that Bodie breathes on the page: Box breathing, 4-7-8 breathing, Physiological sigh, Resonance breathing. The free four overall are Box, Deep Slow Breathing, 2-to-1 and Triangle.)

**Free marker:** Free

**Count labels beside Bodie (font marks U+E010 inhale, U+E011 hold, U+E012 exhale):** Breathe in / Hold / Breathe out

**More in the Library (four tabs, names as in the app):**
- Techniques: more than 40, each with a practice guide.
- Advanced: O2 and CO2 tables for breath-hold training. Dry land only.
- Guided: sessions in Collin's voice, with ambient sound and haptic cues.
- Sleep sounds: rain, ocean waves, brown noise, a crackling fire and more.

**Practice your way (short line):** Set the timer from 3 to 20 minutes, a custom length or no limit. Layer music, nature sounds, voice guidance and haptics, each with its own volume. Haptic-only mode is for silent practice.

**Safety line:** Intense techniques show a short safety note before you start. If you have a heart, lung or other medical condition, check with your doctor before you begin a new breathing practice.

**Button:** Download and start free (App Store, `ct=site-library`)

**Alt, screenshot 06-library:** GroundApp Library with tabs for Techniques, Advanced, Guided and Sleep sounds. The list shows Box breathing, 4-7-8 breathing, Energizing breath, Physiological sigh, 2-to-1 breathing, Alternate nostril and Resonance breathing.

**Alt, screenshot 03-player:** A Resonance session in GroundApp. Bodie sits on his disc as the screen says "Breathe in" with a large count of 4, a pace of 6 seconds and a pause button.

**Alt, clip ch04-education:** Technique info in GroundApp for Box breathing: what it is for, what you do, how long it takes, and what to know before you begin. Then the Library Advanced tab, Progress and Profile.

**Alt, clip ch01-start:** Home in GroundApp. Bodie breathes on his disc while the wheel scrolls through techniques. A Resonance info card opens, then a session starts and Bodie breathes along.

**Alt, clip ch02-timer:** The session timer in GroundApp. A menu offers untimed, 3, 5, 10, 15 or 20 minutes, or a custom length, and a countdown runs under Bodie.

**Alt, clip ch03-sound:** The sound panel in GroundApp. Background audio and volume sliders sit over a running session with Bodie.

Source: [S1] (names, tabs, 40+, practice guides, timer, sleep sounds, safety) [S2] (Box, 4-7-8, Energizing, 2-to-1 patterns and the list, read from screenshot 06) [S7] (the four free techniques)

---

## advanced

**H2:** Advanced: O2 and CO2 tables.

**Lede:** Breath-hold training with a table that sets the rounds for you.

**Body:**
O2 and CO2 tables for breath-hold training. Start from a ready-made table, build one from your own reference hold, or set every number yourself. You begin each hold and you can stop any time.

**Safety line (always visible, set apart):** Dry land only. Never in or near water.

**What's in the tab (names as the app lists them):**
- O2 tables: longer holds, steady recovery.
- CO2 tables: steady holds, shorter recovery.
- My tables: saved tables live here.
- Record a hold: an optional stopwatch. No target, no goal.
- Learn: recovery, preparation, stopping and risk.
- Training history: each hold against its target.

**CO2 rounds (fills in on scroll; numbers from the app's own quick start):**
CO2, 1-minute holds. Six holds of 1:00. Rests between holds: 0:50, 0:40, 0:30, 0:20, 0:10. Final recovery 1:00.

**Caption under the rounds:** Every hold is the same length. The rest between holds gets shorter each round.

**Small print:** These are advanced short-recovery sessions, not a first practice and not medical clearance. You choose when each hold begins and can stop at any time.

**Button:** See Advanced in the app (App Store, `ct=site-advanced`)

**Alt, clip ch05-advanced:** The Advanced tab in GroundApp. It lists O2 tables, CO2 tables, My tables, Record a hold and Learn. A CO2 table with 1-minute holds opens, shows each round and its rest, then a reference-hold setup.

**Alt, screenshot 07-advanced:** GroundApp Library on the Advanced tab, listing O2 tables, CO2 tables, My tables, Record a hold, Learn and Training history.

**Alt, screenshot 08-co2-table:** A CO2 table in GroundApp. Quick starts for 1-minute holds and 90-second holds, a "Use my reference" option, and a Custom option.

Source: [S1] (description, safety line, tab contents) [S9: screenshots 07, 08 for the tab names, quick start numbers, the "short-recovery" note and the caption]

---

## play

**H2:** Bodie's Breath Run.

**Lede:** A free breathwork game. One button. Hold your breath to win.

**Body:**
Bodie, Kip the Caffeine Crow, Sage the Owl and Ember the Fox, in your browser. Tap to jump. Press and keep holding to hold your breath, and Bodie walks through Worry Clouds. Let go to breathe out. The techniques in it are real ones.

**Modes (name, then line):**
- **Race Kip.** Race Kip the Caffeine Crow over 5 courses, each built on a real technique: box breathing, breath-hold dives, the physiological sigh, power breaths and glide control.
- **Daily Dash.** One new course a day, the same for everyone. It resets at midnight.
- **The Big Hold.** Your max breath hold. Put a thumb on the screen, hold your breath, and Bodie dives for as long as your thumb stays down. Let go the moment you need to breathe. Your time and distance are saved so you can beat your own record.
- **Breath Surf.** Five techniques: resonance breathing, box breathing, 4-7-8, the physiological sigh and power breaths. Press as you breathe in, let go as you breathe out, and stay on the ribbon.

**The Big Hold safety note (shown with the mode, wording from the game):** Breathe safe. Sit or lie down. Never practice breath holds in or near water, while driving, or standing up. Stop if you feel dizzy, tingly or light-headed. Skip this mode if you're pregnant or have a heart or lung condition.

**The cast (name, role, line):**
- **Bodie, hero.** GroundApp's breathing buddy. Runs on belly breaths. Has never skipped an exhale.
- **Kip the Caffeine Crow, rival.** Fast, loud, on espresso number seven. Sprints in bursts, then crashes hard.
- **Sage the Owl, coach.** Lives in the Great Tree. Calm voice, calls every breath cue. Has never rushed. Not once. Not even for dessert.
- **Ember the Fox, shopkeeper.** Runs the Root Market. Swaps your Breath Seeds for Gold Leaves and sells upgrades and new looks.

**Fine print:** Free. Plays in your browser. Your records stay in your browser.

**Buttons:**
- Play Bodie's Breath Run (primary, link /play)
- Get the app (secondary, App Store, `ct=site-play`)

**Alt, Bodie (data-portrait):** Bodie sitting on his cushion.
**Alt, Kip:** Kip the Caffeine Crow.
**Alt, Sage:** Sage the Owl.
**Alt, Ember:** Ember the Fox.
**Alt, game preview image (og image play):** Bodie, GroundApp's breathing figure, sitting on his cushion next to Kip the Caffeine Crow.

Source: [S10] (`game/README.md`, `site/play.html`, `game/src/1-page.html`, `game/src/2-core.js`: modes, cast, safety note, records-in-browser, Daily Dash reset)

---

## aura

**H2:** Aura builds your plan.

**Tag next to the headline:** Premium

**Lede:** Aura is my AI expert in nervous system regulation.

**Body:**
Sign in, check in, and Aura builds a plan: two or three techniques, about 10 minutes, with a note on why each one fits how you feel.

Aura asks before anything leaves your phone, and you can turn it off any time in Profile. Without Aura you still get a plan from your answers.

**Button:** Try Premium (App Store, `ct=site-aura`)
**Button note:** A 3-day free trial for eligible new subscribers. Then $39.99 a year.

**Alt, screenshot 05-check-in-plan:** A session plan in GroundApp: Physiological sigh, 4-7-8 breathing and Resonance breathing, each with a one-line reason, and a Begin session button.

Source: [S1] (Aura paragraph, trial, price) [S9: screenshot 05]. The lede uses "my" because Collin speaks on this page. The App Store text says "Collin Chartier's AI expert".

---

## connections

**H2:** Works with what you wear.

**Lede:** Apple Health, Apple Watch, and a live heart rate while you breathe.

**Blocks (title, then line):**
- **Apple Health.** Turn it on and GroundApp reads your heart rate, HRV, sleep, steps and active energy to suggest the right breathwork for today. It saves your sessions to Health as mindful minutes.
- **Live heart rate.** Tap the heart button in the player to connect any standard Bluetooth heart rate monitor, or a Whoop or Garmin with heart rate broadcast on. Watch live heart rate and HRV (RMSSD) as you breathe, then get a recap and charts. HRV needs beat-to-beat data.
- **Whoop, Garmin, Oura, COROS and more.** They connect through Apple Health, not directly. Turn on syncing to Apple Health in your wearable's app, then turn on Apple Health in GroundApp.
- **Apple Watch.** Practice on your wrist with the Apple Watch app.

**Safety line (always visible):** Readings inform suggestions. They are not a medical assessment.

**Requirements:** iPhone with iOS 17 or later. Apple Watch app included.

**Alt, screenshot 10-health:** The Health and devices screen in GroundApp. Apple Health is switched on, a card explains that Whoop, Garmin, Oura, COROS and other wearables connect through Apple Health, and a Bluetooth heart rate monitor row shows "Not connected".

**Alt, clip ch07-health:** GroundApp opens on Bodie saying "Hi, I'm Bodie", then the Health and devices screen. The Apple Health access prompt appears.

**Alt, watch 01-bodie-instant-calm-breathe-in:** Apple Watch showing Bodie on his disc with "Breathe in" in Instant Calm.
**Alt, watch 02-box-breathing-breathe-in:** Apple Watch showing Bodie in Box breathing, "Breathe in 1", cycle 1 of 4.
**Alt, watch 03-box-breathing-hold:** Apple Watch showing Bodie with eyes closed, "Hold 4", cycle 1 of 4.
**Alt, watch 04-box-breathing-breathe-out:** Apple Watch showing Bodie in Box breathing, "Breathe out 4", cycle 1 of 4.
**Alt, watch 05-physiological-sigh-breathe-out:** Apple Watch showing Bodie in the physiological sigh, "Breathe out 6", cycle 1 of 5.

**Watch caption:** Bodie on your wrist.

Source: [S1] (all four blocks and the safety line) [S9: screenshot 10, clip ch07, watch screenshots]

---

## progress

**H2:** Watch the reps add up.

**Body:**
Track your streaks and session history. Take the BOLT test, a comfortable breath hold timed in seconds, and watch your scores over time. Training history keeps your Advanced tables and holds.

**Chart caption (from the screenshot):** BOLT score over time. Connect Apple Health to see your heart rate variability, resting heart rate and sleep next to it. You choose what GroundApp can read.

**Button:** Start your streak (App Store, `ct=site-progress`)

**Alt, screenshot 09-progress:** GroundApp Progress screen. A "Health insights" card offers Connect Apple Health. Below it, a BOLT score of 32 seconds with a line chart rising across five weeks and a Test now button.

Source: [S1] (first two sentences, "Training history keeps your Advanced tables and holds") [S9: screenshot 09 for the card, the chart and the "you choose what Ground can read" line]

---

## story

**H2:** I know the way back because I had to find it.

**Body (Collin's words, in order; each paragraph sits beside its photo or on its own):**

**1. Then (photo: collin-ironman-win, caption "2022, IRONMAN Mont-Tremblant")**
I spent my twenties as a pro triathlete. I won an IRONMAN and the PTO US Open and raced for Team USA.

**2. The ban**
In 2023 I tested positive for EPO and lost my pro career. That one's on me, and it played out in the news.

**3. The rebuild**
The rebuild started with my breath. Learning to regulate my nervous system is how I got my agency back. So I became a coach, built GroundApp, and started teaching the tools that got me through.

**4. Why GroundApp**
My clients would leave a session feeling incredible: regulated, grounded, present in their body. Then they'd go back to their inbox, their commute, their 14-hour workday. They'd try breathwork apps. But none of them answered the question my clients actually needed answered: "I feel anxious right now. What should I breathe?"

That's the question that started GroundApp. What they need is for someone to say: "I hear you. Here's exactly what to do right now. Follow my voice." That's what I do in person. That's what I wanted an app to do.

**5. Running Home (photo: collin-run-home, caption "2026, Running Home")**
In the summer of 2026 I ran 2,000 miles from Potts Field in Boulder to the steps of the Lincoln Memorial to raise money and awareness for the Herren Project, which gives free support for prevention, recovery and resilience to people and families affected by addiction. Every mile was for the people still in the rebuild.

**6. Today**
Today I coach people through their own comebacks, one on one, in groups and from the stage.

**Name line (end of the section):** From the mind into the body, this is where we feel grounded.

**Buttons:**
- Watch my intro (the same film as in the Collin section; plays on tap)
- Coaching with Collin (link https://collinchartier.com, opens in a new tab)
- Read why I built GroundApp (link /blog/why-i-built-groundapp/)

**Alt, photo 1:** Collin breaking the finish tape at IRONMAN Mont-Tremblant in 2022, arms raised, mouth open mid-yell.
**Alt, photo 2:** Collin from behind, in a white hood and running vest, running down a country road toward a tractor.

Source: paragraphs 1, 2, 3 and 6 are collinchartier.com `About.tsx` word for word [S5]. Paragraph 5 is `RunningHomeBand.tsx` word for word, plus "2,000 miles" taken from that band's headline [S5]. Paragraph 4 is cut from his own blog post "Why I built GroundApp" [S11]: every sentence is his, with some sentences left out. The name line is the existing site motto [S4] [S11].

---

## pricing

**H2:** Start free. Go deeper with Premium.

**Lede:** GroundApp is free to download. Four core techniques stay free.

**Plan 1: Free, $0**
- 4 core techniques: Box breathing, Deep slow breathing, 2-to-1 breathing and Triangle breathing
- Session timer
- Streaks
- Basic stats
- Check-ins with Bodie
- Live heart rate

**Plan 1 sub-line:** Free to download. No account needed to begin.

**Plan 2: GroundApp Premium, $39.99 a year (US)**
- All 40+ techniques
- Advanced O2 and CO2 tables
- Guided sessions in Collin's voice
- Aura, Collin's AI expert in nervous system regulation

**Plan 2 sub-line:** A 3-day free trial for eligible new subscribers.

**Plan 2 fine print:** Premium is a yearly subscription that renews automatically. It is billed through your Apple ID. Cancel any time in Settings > your name > Subscriptions, at least 24 hours before the period ends.

**Buttons:**
- Download free (under Free, App Store, `ct=site-pricing-free`)
- Try Premium (under Premium, App Store, `ct=site-pricing-premium`)

Source: [S1] (free list, Premium list, price, trial, renewal, "no account needed", guest) [S7] (the four free technique names)

---

## reviews

**H2:** Rated 5.0 on the App Store, from 11 ratings.

**Sub-line:** Three reviews, word for word.

**Review 1 (large)**
**Title:** Perfect for those stressful moments
**Quote:** "I've tried a lot of meditation and breathing apps, but GroundApp stands out because of how simple and intentional it feels. The design is calming, the guided breathing exercises are easy to follow, and it's become a tool I actually use when I'm feeling stressed, overwhelmed, or need to reset during the day."
**Name:** Frænkie, App Store review

**Review 2**
**Title:** Breath work
**Quote:** "I run it in my vehicle between appointments, and it's been a game changer for staying focused, grounded, and mentally sharp throughout the day. The guided breathwork is simple but extremely effective, whether I need to reset, boost energy, or calm down."
**Name:** okh78, App Store review

**Review 3**
**Title:** Box breathing at your convenience
**Quote:** "Designed by a master in the practice! Really helped me down regulate before bed"
**Name:** Jshehebd, App Store review

**Button:** Leave a review (link https://apps.apple.com/app/id6760352779?action=write-review, opens in a new tab)
**Button note:** Opens the App Store.

**Review markup labels:** each card is a figure; use "App Store review" as the visible source line exactly as above.

Source: [S4] (current `site/index.html` reviews, verbatim) and the rating line from the same file ("5.0 average from 11 ratings") reworded to the requested sentence; count agrees with [S7] and `site/llms.txt` [S12].

---

## download

**H2:** Find your ground today.

**Lede:** From the mind into the body. Your first breath is free.

**App Store block:**
- Button: Download on the App Store (primary, `ct=site-download`)
- Line under it: Free on iPhone, with an Apple Watch app. Requires iOS 17 or later.

**Newsletter block**
- H3: Breathwork notes from Collin
- Body: Breathwork tips, nervous system insights and GroundApp updates, sent to your inbox.
- Field labels (also placeholders): First name (optional) / Email address
- Button: Keep me updated
- Button while sending: Joining...
- Note under the form: No spam. Unsubscribe anytime.
- Success, new: You're in. Check your inbox for a welcome from Collin.
- Success, already on the list: You're already on the list. Thanks for being here.
- Errors: That email doesn't look right. Check it and try again. / Too many tries in a row. Give it a minute, then try again. / That took too long. Check your connection and try again. / We couldn't reach the server. Check your connection and try again. / Something went wrong on our end. Please try again.

**Connect block**
- H3: Say hi
- Instagram: Follow Collin on Instagram (link https://instagram.com/collinchartier)
- Coaching: Want to work with me one on one, in a group or from the stage? Coaching is at collinchartier.com. (link text: collinchartier.com, link https://collinchartier.com)

**Review prompt (one line, links to the App Store review page):** Enjoying GroundApp? Leave a review.

Source: [S4] (headline, lede, newsletter text, labels, messages, all from `site/index.html` and `site/js/home-v2.js`) [S5] (Instagram URL, coaching site, `INSTAGRAM_URL` in `lib/home/content.ts`) [S1] (iOS 17, Apple Watch)

---

## faq

**H2:** Questions, answered

**What does GroundApp cost?**
GroundApp is free to download. GroundApp Premium is $39.99 a year in the US and adds all 40+ techniques, the Advanced O2 and CO2 tables, guided sessions in my voice and Aura. Eligible new subscribers get a 3-day free trial.

**What do I get for free?**
Four core techniques: Box breathing, Deep slow breathing, 2-to-1 breathing and Triangle breathing. You also get the session timer, streaks, basic stats, check-ins with Bodie and live heart rate.

**Who is Bodie?**
Bodie is your breathing companion. He sits in the middle of Home and breathes the rhythm of your technique. Press and hold on Bodie and breathe with him. My 3-minute intro film shows why I made GroundApp and how to use it. You can find it in Profile > Help.

**How does the check-in work?**
Tap Check in on Home. Name how you feel, then rate how strong it is and your energy. GroundApp maps that to a nervous system state and matches breathwork to it.

**What is Aura?**
Aura is my AI expert in nervous system regulation, and it is part of Premium. Sign in, check in, and Aura builds a plan: two or three techniques, about 10 minutes, with a note on why each fits. Aura asks before anything leaves your phone, and you can turn it off any time in Profile. Without Aura you still get a plan from your answers.

**Do I need an account?**
No. Use GroundApp as a guest, or sign in with Apple or Google. Aura needs you to sign in. You can delete your account any time in Settings.

**Is that really Collin's voice?**
The guided sessions use an AI model of my voice, trained on my own recordings. If you'd rather not hear a voice at all, haptic-only mode lets you breathe with vibrations.

**What are the Advanced tables, and are they safe?**
O2 and CO2 tables are breath-hold training. You can start from a ready-made table or build one from your own reference hold, you begin each hold, and you can stop any time. Dry land only. Never in or near water. Intense techniques show a short safety note before you start. If you have a heart, lung or other medical condition, check with your doctor before you begin a new breathing practice.

**Which devices and wearables does it work with?**
GroundApp runs on iPhone with iOS 17 or later. The Apple Watch app (watchOS 11 or later) breathes with Bodie on your wrist. Apple Health reads your heart rate, HRV, sleep, steps and active energy, and saves your sessions as mindful minutes. For live heart rate and HRV in a session, connect a standard Bluetooth heart rate monitor, or a Whoop or Garmin with heart rate broadcast on. Whoop, Garmin, Oura, COROS and other wearables also reach GroundApp through Apple Health. Readings inform suggestions. They are not a medical assessment.

**Does it work offline?**
Bundled sessions work without a connection.

**How do I cancel Premium?**
Premium is an Apple subscription, so you manage it on your iPhone: open Settings, tap your name, then Subscriptions, then GroundApp. It renews automatically unless you cancel at least 24 hours before the end of the current period.

**Where is my data, and can I delete it?**
You can export your data as CSV or JSON and delete your account any time in Settings. For exactly what is collected, where it is stored and who processes it, read our [privacy policy](/privacy).

**Is this therapy?**
No. This is coaching and education, not medical or mental health treatment. If you're dealing with panic attacks, trauma, or thoughts of hurting yourself, start with a licensed professional. In the US you can call or text 988 any time.

**Is Bodie's Breath Run free?**
Yes. It is a free game that plays in your browser at [groundapp.live/play](/play). Your records stay in your browser.

Source: [S4] (question set and the answers on voice, offline, data, cancel, carried over and updated) [S1] (cost, free list, Bodie, check-in, Aura, accounts, Advanced, wearables, safety, cancel, 988) [S11] (voice disclosure, haptic-only) [S10] (game) [S14] (watchOS 11 and iOS 17 deployment targets in the app project)

---

## footer

**Tagline:** From the mind into the body. Breathwork by Collin Chartier.

**Links (label, link):**
- Blog, /blog/
- Play, /play
- Support, /support
- Privacy, /privacy
- Terms, /terms
- Instagram, https://instagram.com/collinchartier
- Contact, mailto:collin@groundapp.live
- App Store, App Store link, `ct=site-footer`

**Footer nav aria-label:** Footer

**Health line:** GroundApp is coaching and education, not medical or mental health treatment.

**Copyright:** © 2026 GroundApp. Made by Collin Chartier.

Source: [S4] (current footer, minus About, which now redirects to #story) [S6] (required line)

---

## llms

**Intro paragraph (the `>` block at the top of `llms.txt`):**

> GroundApp is a breathwork app for iPhone and Apple Watch, created and developed by Collin Chartier, a performance breathwork coach. Bodie, a breathing companion, sits in the middle of Home and breathes along with your technique. You check in with Bodie, name how you feel, and GroundApp matches breathwork to it. It has more than 40 breathing techniques with practice guides, Advanced O2 and CO2 tables for breath-hold training (dry land only), guided sessions in Collin's voice, sleep sounds, live heart rate and HRV, and Apple Health. Free to download on the App Store. GroundApp Premium is $39.99 a year in the US. Website: https://groundapp.live

**Replacement lines for the sections below it:**

Pricing:
- Free to download. Four core techniques are free, along with the session timer, streaks, basic stats, check-ins with Bodie and live heart rate.
- GroundApp Premium is $39.99 a year (US). It adds all techniques, the Advanced O2 and CO2 tables, guided sessions and Aura. Eligible new subscribers get a 3-day free trial. Billed through Apple; cancel any time in Settings > your name > Subscriptions.

About the creator:
- [Collin Chartier](https://groundapp.live/#story): Performance breathwork coach. IRONMAN champion, PTO US Open winner and Team USA athlete. Ran 2,000 miles from Boulder to the Lincoln Memorial for the Herren Project. He created and developed GroundApp.

Pages: Home (https://groundapp.live/), Story (https://groundapp.live/#story), FAQ (https://groundapp.live/#faq), Play (https://groundapp.live/play), Blog, Privacy, Terms, Support. Drop the About line.

Rating line: Rated 5.0 on the US App Store (11 ratings as of October 2026).

Source: [S1] [S5] [S12] (current `site/llms.txt` structure and rating line)

---

## Sources

- S1: `docs/site-v3/app-store-listing-2026-10-29.txt` (App Store release notes and description, v1.2.1): free and Premium lists, 40+ techniques, practice guides, Advanced, Aura, connections, Apple Health, live heart rate, price, trial, safety and 988 lines, "no account needed", guest, press-and-hold on Bodie, intro film.
- S2: `~/dev/groundapp-website-assets-v3/screenshots-iphone/06-library.png` (read as an image): technique names and patterns (Box 4-4-4-4, 4-7-8, Energizing 2-2, Physiological sigh, 2-to-1 4-8, Alternate nostril, Resonance) and the four tabs.
- S3: `docs/superpowers/specs/2026-10-30-site-v3-redesign-design.md`, "Changes after Collin's review": headline "Breathe with Bodie.", two photos, three reviews, Instagram only, free to download.
- S4: current `site/index.html` (hero meta, reviews, pricing, FAQ, newsletter, footer, nav, sticky bar) and `site/js/home-v2.js` (form messages), as of this worktree.
- S5: `~/dev/collinchartier.com/components/home/About.tsx`, `Hero.tsx`, `RunningHomeBand.tsx` and `lib/home/content.ts` (story paragraphs, press names, Instagram URL, photo alt text).
- S6: `docs/site-v3/Brand Book.md` and `docs/site-v3/Copy Bank.md` (voice rules, required lines, "From the mind into the body").
- S7: `docs/superpowers/plans/2026-10-30-site-v3.md`, "Shared contracts" and Task 1 (section ids, nav order, Facts, safety lines, app id 6760352779).
- S8: `~/dev/groundapp-website-assets-v3/README.md` and `portraits/` (photo names; I viewed collin-ironman-win.jpg and collin-run-home.jpg for alt text).
- S9: `~/dev/groundapp-website-assets-v3/screenshots-iphone/`, `screenshots-watch/` and `clips/` (I viewed screenshots 02 to 10, all five watch screens, and contact sheets of all eight clips for alt text).
- S10: `game/README.md`, `site/play.html`, `game/src/1-page.html`, `game/src/2-core.js` (modes, cast, safety note, Daily Dash reset, records stay in the browser).
- S11: `site/blog/why-i-built-groundapp/index.html` (Collin's own words on why he built it, AI voice disclosure, haptic-only mode).
- S12: `site/llms.txt` (rating line, page list, game description).
- S13: `~/Desktop/GroundApp v2 Store Assets/APP-STORE-CONNECT-1.2.1.md` (confirms "no account needed to begin", the app works without signing in).
- S14: `~/dev/BreathworkApp-release-1.2.1/Breathwork/Breathwork.xcodeproj/project.pbxproj` (IPHONEOS_DEPLOYMENT_TARGET 17.0, WATCHOS_DEPLOYMENT_TARGET 11.0).

## Not verified, for Collin or Main to confirm

- "Does it work offline? Bundled sessions work without a connection." Carried over from the current FAQ (S4). The v2 App Store text does not say it. Delete if v2 changed it.
- "Collin Chartier designed every session" and the Jane or Oliver narration switch from the current FAQ were dropped: not in the v2 listing.
- Resonance pace: the app screenshots show Resonance at a 6 s pace (home wheel "6 - 6", player "Pace 6 s"). The plan's Bodie default is 5.5 s. Copy gives no number for Resonance. Check which one is right before showing a count.
- The current site said Premium is "about $2.50 a month". That is wrong at $39.99 a year, so it is not in this deck.
- The Alternate nostril and Resonance one-liners ("Breathe through one nostril at a time", "Even in, even out") describe the technique names only; the app's own sub-lines for those two are cut off in screenshot 06.
- Which techniques are the free four comes from the plan Facts (Box, Deep Slow Breathing, 2-to-1, Triangle). The Library table marks Box and 2-to-1 as Free because both are visible in screenshot 06 and in that list.
- Thrive Real Estate Group appears in Collin's collinchartier.com bio. It is left out here on purpose (not about breathwork).
