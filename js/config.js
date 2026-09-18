/* ==========================================================================
   BBUBER SETTINGS FILE
   --------------------------------------------------------------------------
   Every joke, name, price and place on the site lives in this one file.
   Change the words between the quote marks and save. Nothing else to do.

   Rules of thumb so nothing breaks:
   - Keep the quote marks around words: "like this".
   - Keep the comma at the end of each line inside a list.
   - Numbers (prices, ratings, coordinates) have no quote marks.
   - Lines starting with // are notes for humans. The site ignores them.

   Anything marked PLACEHOLDER is made up and waiting on the real list.
   ========================================================================== */

window.BBUBER = {

  /* ---------------------------------------------------------------- Brand */
  brand: {
    name: "BBUber",
    tagline: "The designated driver service of the Milford Bourbon Boys.",
    heroHeadline: "Go anywhere in Milford. Get home eventually.",
    heroSub: "Request a ride from a stone-cold sober Bourbon Boy in minutes. Serving the Village of Milford, MI, and wherever the tasting ends up.",
    appGreetingName: "Bourbon Boy",       // "Good evening, Bourbon Boy"
    passengerRating: 4.71,                 // shown in the app menu
    cardName: "Bourbon Card",              // the fake payment method
    cardLast4: "1792",
    walletJoke: "Balance: 3 pours, a half-empty bottle of Old Grand-Dad, and an IOU from last Derby.",
  },

  /* --------------------------------------------------------- Service area */
  // Rides must start and end within radiusMiles of the center point.
  serviceArea: {
    center: [42.5919, -83.6005],           // Main St & Commerce Rd, downtown Milford
    centerName: "Downtown Milford",
    centerSub: "Main St & Commerce Rd",
    radiusMiles: 7,
    outOfAreaTitle: "BBUber doesn't go there",
    outOfAreaMessages: [
      "We serve the Village of Milford and wherever the tasting ends. That's not either of those.",
      "Our drivers get nervous past Kensington. Try somewhere closer to Main Street.",
      "Outside the service area. Call a real cab, or a real friend.",
      "That's past the edge of the known bourbon world. Pick a spot in Milford.",
    ],
    outsideOnLaunch: "You're outside Milford, so we set your pickup downtown. Get here and we'll talk.",
    sameSpotJoke: "That's where you already are. Walk it off.",
    sameSpotMiles: 0.03,                   // closer than this (about 50 m) gets the joke above
  },

  /* -------------------------------------------------------------- Pricing */
  // Fare = (base + per mile + per minute) x ride type multiplier x proof multiplier,
  // never less than the minimum fare, plus the fees listed further down.
  pricing: {
    baseFare: 2.50,
    perMile: 1.45,
    perMinute: 0.30,
    minimumFare: 7.00,
    pourPrice: 12.00,                      // one pour of bourbon, in dollars, for "≈ 2.1 pours"
    cancellationFee: 5.00,
    cancellationJoke: "You'll be charged a $5.00 cancellation fee and you owe the group a pour.",
    tipOptionsPours: [0.5, 1, 2],          // tip buttons on the receipt, in pours
  },

  // Fees added to every ride, shown on the receipt.
  receiptFees: [
    { label: "Bourbon Boys Cellar Fund", amount: 1.92 },
    { label: "Glencairn cleaning fee", amount: 0.75 },
  ],

  /* --------------------------------------------------- Proof multiplier */
  // Our version of surge pricing. Checked against the real clock.
  // days: 0 = Sunday ... 6 = Saturday. Hours use a 24 hour clock.
  // A "to" hour past 24 runs into the next morning (26 = 2am).
  surge: {
    forceMultiplier: null,                 // set to a number like 2.5 to force it for a demo
    baseProof: 80,                         // 1.0x is 80 proof, 2.0x is 160 proof
    schedule: [
      { days: [5, 6], from: 20, to: 26, multiplier: 1.8, label: "It's a weekend night in Milford." },
      { days: [4],    from: 19, to: 24, multiplier: 1.3, label: "Thirsty Thursday." },
      { days: [0],    from: 11, to: 15, multiplier: 1.2, label: "Sunday brunch rush." },
    ],
    // The first Saturday in May is always the worst.
    derbyDay: { multiplier: 2.5, label: "It's Derby Day. Godspeed." },
  },

  /* ----------------------------------------------------------- Ride types */
  tiers: [
    {
      id: "neat",
      name: "BBUber Neat",
      icon: "🥃",
      blurb: "Affordable rides, no chaser.",
      seats: 4,
      multiplier: 1.0,
      extraMinutes: 0,                      // added to the pickup time estimate
    },
    {
      id: "rocks",
      name: "On the Rocks",
      icon: "🧊",
      blurb: "A little extra legroom. Comes with ice.",
      seats: 4,
      multiplier: 1.35,
      extraMinutes: 2,
      extraFee: { label: "Ice fee", amount: 1.50 },
    },
    {
      id: "barrel",
      name: "Barrel Proof",
      icon: "🛢️",
      blurb: "Premium rides, uncut and unfiltered. Seats six.",
      seats: 6,
      multiplier: 1.9,
      extraMinutes: 4,
      extraFee: { label: "Rickhouse storage fee", amount: 3.00 },
    },
    {
      id: "pappy",
      name: "Pappy",
      icon: "👑",
      blurb: "The finest ride in the world.",
      seats: 2,
      multiplier: 25,
      unavailable: true,
      unavailableText: "Unavailable · 23 year waitlist",
      unavailableJoke: "Pappy is allocated. You're number 4,812 on the list.",
    },
  ],

  /* -------------------------------------------------------------- Drivers */
  // The real Bourbon Boys. The names are real. The cars, plates, bourbons,
  // emoji and one-liners are PLACEHOLDER jokes until the real ones come in.
  // avatar is an emoji (here it matches the bourbon). To use a photo instead,
  // put the image in an images/drivers folder and add a line like:
  //   photo: "images/drivers/rick.jpg",
  drivers: [
    {
      name: "Rick",
      avatar: "🌾",
      rating: 4.97,
      trips: 1792,
      vehicle: "2011 Buick LaCrosse",
      color: "Champagne",
      plate: "BRBN 12",
      bourbon: "Weller Special Reserve",
      about: "Has opinions about Pokemon. Will share them.",
    },
    {
      name: "Andrew",
      avatar: "🌹",
      rating: 4.91,
      trips: 864,
      vehicle: "2004 Ford F-150",
      color: "Forest green",
      plate: "RYE 4 U",
      bourbon: "Four Roses Single Barrel",
      about: "Not that Andrew. The other one. Equally sober.",
    },
    {
      name: "Other Andrew",
      avatar: "🦅",
      rating: 4.89,
      trips: 402,
      vehicle: "2019 Jeep Grand Cherokee",
      color: "Barrel brown",
      plate: "ANDREW2",
      bourbon: "Eagle Rare 10",
      about: "Not that Andrew. The other one. Equally sober.",
    },
    {
      name: "Ryan",
      avatar: "📜",
      rating: 4.93,
      trips: 1150,
      vehicle: "2021 Ford Explorer",
      color: "Midnight blue",
      plate: "PROOF",
      bourbon: "1792 Small Batch",
      about: "Has a spreadsheet of every bottle in the group. It's color coded.",
    },
    {
      name: "Matt",
      avatar: "🦬",
      rating: 4.88,
      trips: 733,
      vehicle: "2018 Chevy Silverado",
      color: "Char black",
      plate: "NO CHSR",
      bourbon: "Buffalo Trace",
      about: "Has access to your hospital bills, and knows you know it.",
    },
    {
      name: "Alan",
      avatar: "🎩",
      rating: 4.86,
      trips: 97,
      vehicle: "2008 Honda Odyssey",
      color: "Questionable",
      plate: "BIB 100",
      bourbon: "Old Forester 1920",
      about: "Can dunk on you. Actually.",
    },
    {
      name: "Brandon",
      avatar: "🦃",
      rating: 4.95,
      trips: 1310,
      vehicle: "2020 Ford Bronco",
      color: "Copper",
      plate: "CHAR 4",
      bourbon: "Wild Turkey 101",
      about: "Brings the good stuff to the monthly meeting. Never the Fireball.",
    },
    {
      name: "Denny",
      avatar: "🔥",
      rating: 4.99,
      trips: 2310,
      vehicle: "2016 Chrysler Pacifica",
      color: "Minivan silver",
      plate: "NEAT 1",
      bourbon: "Elijah Craig Small Batch",
      about: "Designated driver so often the car has its own loyalty card.",
    },
    {
      name: "Jason",
      avatar: "⛰️",
      rating: 4.90,
      trips: 988,
      vehicle: "2017 GMC Sierra",
      color: "Oak",
      plate: "DD 4 U",
      bourbon: "Knob Creek 9",
      about: "Drives this car like he drives a mountainbike; smooth, controlled, straight into a ditch.",
    },
    {
      name: "Joe",
      avatar: "🪵",
      rating: 4.92,
      trips: 640,
      vehicle: "2015 Chevy Tahoe",
      color: "Caramel",
      plate: "OAKED",
      bourbon: "Woodford Reserve",
      about: "Says “just a splash of water” like it's a moral position.",
    },
    {
      name: "Kyle",
      avatar: "🕯️",
      rating: 4.87,
      trips: 515,
      vehicle: "2022 Jeep Wrangler",
      color: "Rickhouse red",
      plate: "WHEATD",
      bourbon: "Maker's Mark 46",
      about: "Suggests you come hear the stereo rather than taking you to your destination.",
    },
    {
      name: "Mike",
      avatar: "🧭",
      rating: 4.94,
      trips: 1204,
      vehicle: "2012 Dodge Durango",
      color: "Amber",
      plate: "MASH",
      bourbon: "Russell's Reserve 10",
      about: "Knows every back road to Kensington. Uses all of them.",
    },
    {
      name: "Pat",
      avatar: "🐎",
      rating: 4.96,
      trips: 1427,
      vehicle: "2019 Buick Enclave",
      color: "Pearl",
      plate: "ANGLSHR",
      bourbon: "Blanton's (when it can be found)",
      about: "Provides deep cut jam band vinyl suggestions.",
    },
    {
      name: "Michael",
      avatar: "🥃",
      rating: 4.85,
      trips: 356,
      vehicle: "2014 Cadillac Escalade",
      color: "Black",
      plate: "BARREL",
      bourbon: "Michter's US*1",
      about: "Not Mike. Michael. The paperwork matters.",
    },
    {
      name: "Killian",
      avatar: "📚",
      rating: 4.90,
      trips: 212,
      vehicle: "2013 Ford Escape",
      color: "Silver",
      plate: "SOBER 1",
      bourbon: "Booker's",
      about: "Plays 90s country at a volume best described as committed.",
    },
  ],

  /* --------------------------------------------------------------- Places */
  // Real Milford spots. lat and lng are map coordinates; find new ones by
  // right-clicking a spot in Google Maps and copying the two numbers.
  // suggested: true puts the spot on the app's home screen.
  // The bars, houses and joke spots are real. The parks and landmarks further
  // down were starter picks and can go if nobody cares about them.
  places: [
    // "downtown" is the default pickup. It sits at Main & Liberty, a couple of
    // blocks south of the bars, so rides to them aren't "walk it off" distance.
    { id: "downtown",   icon: "📍", name: "Downtown Milford",          sub: "Main St & Liberty St",          lat: 42.5895, lng: -83.6003 },
    { id: "charlies",   icon: "🥃", name: "Charlie's Still on Main",   sub: "525 N Main St · 500+ whiskeys",  lat: 42.59264, lng: -83.60083, suggested: true },
    { id: "rivers-edge", icon: "🍻", name: "River's Edge Brewing",      sub: "125 S Main St",                 lat: 42.586473, lng: -83.600138, suggested: true },
    { id: "milford-house", icon: "🍺", name: "Milford House Bar & Grill", sub: "113 E Commerce Rd",          lat: 42.59194, lng: -83.60007, suggested: true },
    { id: "palate",     icon: "🍽️", name: "Palate",                    sub: "N Main St",                     lat: 42.59146, lng: -83.60058, suggested: true },
    { id: "coffee",     icon: "☕", name: "Proving Grounds Coffee",     sub: "N Main St · the morning after", lat: 42.59063, lng: -83.60051, suggested: true },
    { id: "kroger",     icon: "🧊", name: "Kroger",                     sub: "670 Highland Ave · ice run",    lat: 42.59372, lng: -83.60415, suggested: true },
    // The Bourbon Boys' houses. Street only on purpose: the site is public, so
    // each pin sits about a block up the street, not on the actual house.
    { id: "jason",      icon: "🏠", name: "Jason's house",             sub: "Union St",                      lat: 42.59414, lng: -83.59927 },
    { id: "pat",        icon: "🏠", name: "Pat's house",               sub: "Union St",                      lat: 42.59252, lng: -83.5992 },
    { id: "kyle",       icon: "🏠", name: "Kyle's house",              sub: "Aldil Ct",                      lat: 42.59269, lng: -83.59677 },
    { id: "rick",       icon: "🏠", name: "Rick's house",              sub: "East St",                       lat: 42.59457, lng: -83.59688 },
    { id: "andrew",     icon: "🏠", name: "Andrew's house",            sub: "Duchess St",                    lat: 42.59821, lng: -83.59262 },
    { id: "ymca",       icon: "🏋️", name: "Milford YMCA",              sub: "300 Family Dr · to work it off", lat: 42.589637, lng: -83.614814 },
    { id: "ambulance",  icon: "🚑", name: "The ambulance pickup spot", sub: "For when a Taylor breaks a bone biking", lat: 42.58983, lng: -83.61363 },
    { id: "woods",      icon: "🍃", name: "The woods off Old Plank",   sub: "Where you could smoke weed in the 90s", lat: 42.578028, lng: -83.59025 },
    // Joke spots.
    { id: "flock-commerce", icon: "📸", name: "Flock camera, Main & Commerce", sub: "It already has your plate",  lat: 42.59209, lng: -83.60043 },
    { id: "flock-summit",   icon: "📸", name: "Flock camera, Main & Summit",   sub: "Smile. Wave. It's logged.",   lat: 42.5947, lng: -83.60053 },
    { id: "central-park", icon: "🌳", name: "Central Park",             sub: "Downtown Milford",              lat: 42.58807, lng: -83.60234 },
    { id: "hubbell",    icon: "🦆", name: "Hubbell Pond Park",          sub: "Milford",                       lat: 42.59038, lng: -83.61212 },
    { id: "library",    icon: "📚", name: "Milford Public Library",     sub: "Family Dr · to look busy",      lat: 42.59012, lng: -83.60915 },
    { id: "kensington", icon: "🌲", name: "Kensington Metropark",       sub: "4570 Huron River Pkwy",         lat: 42.55524, lng: -83.63202 },
    { id: "dearborn",   icon: "⛺", name: "Camp Dearborn",              sub: "1700 General Motors Rd",        lat: 42.58557, lng: -83.62955 },
    { id: "bakers",     icon: "🎷", name: "Bakers of Milford",          sub: "S Milford Rd",                  lat: 42.55947, lng: -83.6173 },
    { id: "high-school", icon: "🏫", name: "Milford High School",       sub: "2380 S Milford Rd · reunion committee", lat: 42.61689, lng: -83.62375 },
  ],

  /* ------------------------------------------------------ Trip messages */
  searchingMessages: [
    "Finding your Bourbon Boy…",
    "Checking who drew the short straw…",
    "Confirming your driver is stone-cold sober…",
    "Waiting for someone to finish their story…",
    "Locating car keys…",
  ],
  enrouteMessages: [
    "{driver} is on the way.",
    "{driver} is putting down a perfectly good Glencairn.",
    "{driver} stopped to let a duck cross Main Street.",
    "{driver} is taking the long way past Hubbell Pond.",
    "{driver} is 100% sober and 100% annoyed about it.",
  ],
  arrivedMessages: [
    "{driver} is outside and watching the clock.",
    "Your ride is here. Look for the {color} {vehicle}.",
  ],
  tripMessages: [
    "Enjoy the ride. The playlist is 90s country and there is no appeal process.",
    "{driver} is telling you about a single barrel pick. Nod along.",
    "Passing a liquor store. {driver} slowed down out of respect.",
    "Fun fact: bourbon must be aged in new charred oak. {driver} will tell you why.",
    "Trip is on schedule. Your opinions on wheated bourbon are not.",
    "{driver} rates the angel's share of this trip at about 3%.",
  ],

  /* ------------------------------------------------------------ Driver chat */
  chat: {
    greeting: "Hey, it's {driver}. On my way in the {color} {vehicle}.",
    quickReplies: [
      "I'm out front",
      "Be right there",
      "Which car are you?",
      "Can we stop for ice?",
      "Is there bourbon in the car?",
    ],
    driverReplies: [
      "10-4. Two minutes.",
      "Look for the {color} {vehicle}. Plate {plate}.",
      "No bourbon in the car. That's the whole point of me.",
      "Kroger stop is an extra pour.",
      "I see you. Stop waving.",
      "Copy. Taking Main to avoid the construction.",
    ],
  },
  callJokes: [
    "{driver} can't pick up. Driving, like a responsible Bourbon Boy.",
    "Straight to voicemail. The greeting is just a long description of a mash bill.",
  ],

  /* ------------------------------------------------------ Other app jokes */
  // Shown under the stars on the receipt, for 1 to 5 stars.
  ratingNotes: [
    "Ouch. {driver} will hear about this in the group chat.",
    "Noted. Strongly.",
    "Middle shelf. Fair enough.",
    "Solid. Like a good bottled-in-bond.",
    "Five stars. A Pappy-level ride.",
  ],
  tipThanks: "{driver} says thanks. It's going straight into the Cellar Fund.",
  shareText: "I'm riding BBUber with {driver} in a {color} {vehicle} (plate {plate}), headed to {dropoff}. Pray for me.",
  scheduleJoke: "Scheduling rides isn't a thing. We barely plan the tasting.",
  noLocationJoke: "Location is off. Pick a spot from the list or drop a pin.",

  /* ------------------------------------------------------ Landing page */
  landing: {
    eyebrow: "Now serving the Village of Milford, MI",
    estimatorNote: "Upfront prices. Tips are in pours.",
    howHeadline: "Three taps from the tasting to your couch.",
    ridesHeadline: "A ride for every proof.",
    ridesSub: "Every ride type comes with a sober Bourbon Boy behind the wheel. The only thing that changes is the legroom and how much we charge you for ice.",
    driveHeadline: "Drive with BBUber. Stay sober. Be a hero. Resent it.",
    driveApply: "Apply to drive",
    driveApplyTitle: "Application received",
    driveApplyJoke: "Applications are reviewed at the next tasting. Bring a bottle. Not the cheap one.",
    safetyHeadline: "Your safety is our number two priority.",
    safetySub: "Number one is the bourbon. But it's a close second, and it's why the driver never drinks.",
    reviewsHeadline: "Riders are saying things.",
    appHeadline: "Get the BBUber app.",
    appSub: "Add it to your home screen and it opens full screen, just like a real app. Because it basically is one.",
    howItWorks: [
      { icon: "📱", title: "Request", text: "Open BBUber, tell us where the night is going, and pick your ride. Neat, On the Rocks, or Barrel Proof." },
      { icon: "🚗", title: "Ride",    text: "A Bourbon Boy who drew the short straw pulls up. Stone-cold sober. Visibly resentful." },
      { icon: "⭐", title: "Rate",    text: "Rate your driver and tip in pours. Five stars keeps the group chat peaceful." },
    ],
    driveRequirements: [
      "A valid Michigan driver's license and a car newer than your oldest bottle.",
      "Able to identify Weller by smell alone.",
      "At least three Glencairn glasses, washed.",
      "Zero drinks on driving nights. None. This is the whole business model.",
      "Willing to hear the same Pappy story every single weekend.",
    ],
    driveEarnings: "Drivers earn up to 2 pours an hour, plus first dibs on the next store pick.",
    safety: [
      { icon: "🧍", title: "Sober driver guarantee", text: "The driver is the one who isn't drinking tonight. That's the job. It's the worst part of the job." },
      { icon: "🤝", title: "Verified drivers",       text: "Every driver has been vetted by knowing the rest of us from the monthly meeting." },
      { icon: "📍", title: "Share your trip",        text: "Send your route to anyone who's waiting up for you. They will be anyway." },
      { icon: "💬", title: "24/7 support",           text: "Text the group chat. Someone is always awake arguing about finishing barrels." },
    ],
    // PLACEHOLDER testimonials.
    testimonials: [
      { quote: "Got me from the Milford House to my couch in six minutes. Driver would not stop talking about mash bills. Five stars.", who: "A Bourbon Boy, Friday night" },
      { quote: "Requested Pappy. Still waiting. Very authentic experience.", who: "Hopeful rider" },
      { quote: "My husband went out 'for one pour' and BBUber brought him back. Mostly the same man.", who: "A Milford wife" },
    ],
    appStoreBadges: [
      { small: "Download on the", big: "Hubbell Pond Store" },
      { small: "Get it on",       big: "Main Street" },
    ],
  },

  /* ---------------------------------------------------------- Disclaimer */
  disclaimer: "BBUber is a joke made for the Milford Bourbon Boys. It is not affiliated with, endorsed by, or connected to Uber Technologies, Inc. No cars are sent, no money is charged, and nothing you enter leaves your phone. If you need a ride home, call a real one.",

  /* ---------------------------------------------------------- Simulation */
  // How the fake rides behave. Seconds are real seconds on your screen.
  simulation: {
    matchSeconds: [4, 7],                  // time spent "finding your Bourbon Boy"
    secondsPerRealMinute: 3,               // a 10 minute drive plays out in 30 seconds
    minLegSeconds: 14,                     // shortest a leg of the trip will animate
    maxLegSeconds: 50,                     // longest a leg of the trip will animate
    arrivedWaitSeconds: 8,                 // driver waits this long before the trip starts
    idleCarSpeed: 40,                      // how fast the background cars crawl around
  },
};
