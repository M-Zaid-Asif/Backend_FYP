import { PrismaClient } from '../generated/prisma/index.js';
import prisma from '../src/constants/prisma.js';

async function main() {
  const conditions = [
    {
      title: "Drowning",
      keywords: ["drowning, submerged, underwater, floodwater, river, lake, canal, breathing difficulty, unconscious, rescue, CPR, airway, water rescue, oxygen deprivation, victim, emergency, inhale water, lifesaving, swimming, flood"],
      recoveryPosition: "Lay the person on their back on a firm surface. If breathing but unconscious, place them in the Recovery Position to maintain an open airway.",
      steps: "1. Remove the person from the water safely. 2. Check responsiveness and breathing. 3. Call emergency services immediately. 4. Give 5 rescue breaths if trained. 5. Begin CPR if there is no breathing or pulse until help arrives.",
      precautions: "Never attempt to drain water from the lungs by pressing on the stomach. Avoid putting yourself at risk during rescue."
    },
    {
      title: "Near Drowning",
      keywords: ["near drowning, rescued from water, water inhalation, floodwater, breathing, coughing, river, lake, oxygen, unconscious, rescue, CPR, chest pain, airway, survival, emergency, water accident, victim, hypoxia, flood"],
      recoveryPosition: "Place the person in the Recovery Position if breathing normally but unconscious.",
      steps: "1. Move the person away from the water. 2. Keep them warm. 3. Monitor breathing continuously. 4. Seek immediate medical evaluation even if they appear well. 5. Administer CPR if breathing stops.",
      precautions: "Delayed breathing problems can occur hours later. Never assume the person is fully recovered."
    },
    {
      title: "Choking",
      keywords: ["choking, airway obstruction, cannot breathe, food stuck, object in throat, heimlich, coughing, breathing difficulty, back blows, abdominal thrusts, emergency, victim, first aid, airway, rescue, suffocation, throat blockage, child choking, adult choking, obstruction"],
      recoveryPosition: "Stand behind the conscious person to perform abdominal thrusts if necessary.",
      steps: "1. Encourage coughing if possible. 2. Give 5 back blows. 3. Perform 5 abdominal thrusts. 4. Repeat until the obstruction clears. 5. Start CPR if the person becomes unconscious.",
      precautions: "Do not perform abdominal thrusts on someone who can still cough or speak."
    },
    {
      title: "Severe Bleeding",
      keywords: ["severe bleeding, hemorrhage, blood loss, wound, deep cut, injury, trauma, direct pressure, bandage, emergency, bleeding control, accident, first aid, victim, tourniquet, blood, shock, disaster, rescue, flood injury"],
      recoveryPosition: "Lay the person down and elevate the injured limb above heart level if no fracture is suspected.",
      steps: "1. Apply firm direct pressure with a clean cloth. 2. Secure with a bandage. 3. Add more dressings if soaked. 4. Call emergency services. 5. Monitor for signs of shock.",
      precautions: "Do not remove blood-soaked dressings. Avoid unnecessary movement of the injured person."
    },
    {
      title: "Minor Bleeding",
      keywords: ["minor bleeding, small cut, scrape, abrasion, wound, first aid, clean wound, bandage, bleeding, injury, accident, antiseptic, gauze, emergency, dressing, disaster, rescue, skin injury, cuts, scratches"],
      recoveryPosition: "Seat the person comfortably while treating the wound.",
      steps: "1. Wash hands. 2. Clean the wound with clean water. 3. Apply antiseptic. 4. Cover with a sterile bandage. 5. Replace dressing if dirty.",
      precautions: "Watch for signs of infection such as redness, swelling, or pus."
    },
    {
      title: "Fractures",
      keywords: ["fracture, broken bone, bone injury, splint, swelling, pain, accident, trauma, broken arm, broken leg, disaster injury, emergency, first aid, rescue, immobilize, cast, fall, earthquake injury, flood injury, bone"],
      recoveryPosition: "Keep the injured limb completely still and supported.",
      steps: "1. Immobilize the injured area using a splint. 2. Apply ice wrapped in cloth. 3. Seek medical care immediately. 4. Check circulation beyond the injury. 5. Keep the person calm.",
      precautions: "Never attempt to straighten or push a broken bone back into place."
    },
    {
      title: "Dislocations",
      keywords: ["dislocation, displaced joint, shoulder dislocation, knee injury, elbow injury, joint pain, swelling, emergency, first aid, accident, trauma, immobilize, sling, disaster, rescue, bone injury, joint, fall, earthquake, flood"],
      recoveryPosition: "Support the affected joint in the most comfortable position without forcing movement.",
      steps: "1. Immobilize the joint. 2. Apply a cold pack. 3. Seek immediate medical attention. 4. Monitor circulation below the injury.",
      precautions: "Never attempt to relocate a dislocated joint yourself."
    },
    {
      title: "Sprains",
      keywords: ["sprain, twisted ankle, twisted wrist, ligament injury, swelling, pain, fall, sports injury, disaster, earthquake, flood, first aid, RICE, ice, compression, elevation, joint injury, walking pain, ankle, wrist"],
      recoveryPosition: "Elevate the injured limb above heart level.",
      steps: "1. Rest the injured joint. 2. Apply ice for 20 minutes. 3. Use compression bandage. 4. Elevate the limb. 5. Avoid putting weight on the joint.",
      precautions: "Do not apply ice directly to the skin."
    },
    {
      title: "Head Injury",
      keywords: ["head injury, concussion, head trauma, bleeding, unconscious, dizziness, vomiting, confusion, skull injury, accident, earthquake, disaster, rescue, emergency, first aid, brain injury, swelling, impact, fall, debris"],
      recoveryPosition: "Keep the person lying flat with the head slightly elevated if conscious.",
      steps: "1. Control bleeding gently. 2. Monitor consciousness. 3. Keep the neck still. 4. Call emergency services immediately. 5. Watch for vomiting or seizures.",
      precautions: "Do not move the person unnecessarily if a neck injury is suspected."
    },
    {
      title: "Spinal Injury",
      keywords: ["spinal injury, neck injury, back injury, paralysis, vertebrae, spine, trauma, accident, earthquake, collapse, rescue, emergency, first aid, immobilization, stretcher, movement, disaster, fracture, spinal cord, injury"],
      recoveryPosition: "Keep the person completely still with the head, neck, and spine aligned.",
      steps: "1. Do not move the victim unless there is immediate danger. 2. Stabilize the head. 3. Call emergency services. 4. Monitor breathing. 5. Reassure the victim.",
      precautions: "Improper movement can cause permanent paralysis."
    },
    {
      title: "Crush Injury",
      keywords: ["crush injury, trapped, collapsed building, rubble, earthquake, debris, heavy object, swelling, rescue, emergency, disaster, bleeding, trauma, muscle damage, crush syndrome, first aid, victim, building collapse, pain, fracture"],
      recoveryPosition: "Keep the person warm and calm while waiting for rescue teams.",
      steps: "1. Call emergency services. 2. Control severe bleeding. 3. Monitor breathing. 4. Do not remove heavy objects if trapped for a prolonged period unless necessary for safety.",
      precautions: "Sudden removal of heavy objects may trigger Crush Syndrome and worsen the person's condition."
    },
    {
      title: "Burn Injury",
      keywords: ["burn, fire, scald, electrical burn, chemical burn, heat, skin damage, first aid, emergency, earthquake fire, disaster, rescue, cooling burn, blister, thermal injury, injury, accident, hot surface, flame, smoke"],
      recoveryPosition: "Hold the burned area under cool running water while keeping the rest of the body warm.",
      steps: "1. Cool the burn under running water for at least 20 minutes. 2. Remove tight jewelry carefully. 3. Cover with sterile non-stick dressing. 4. Seek medical care for severe burns.",
      precautions: "Do not use ice, butter, toothpaste, oils, or ointments on fresh burns."
    }, {
      title: "Electrocution",
      keywords: ["electrocution, electric shock, live wire, exposed wire, power line, electricity, current, electrical burn, floodwater electricity, wet surface, unconscious, CPR, rescue, emergency, voltage, hazard, shock injury, power outage, electrical accident, safety"],
      recoveryPosition: "Ensure the power source is turned off before approaching the victim. If unconscious but breathing, place them in the Recovery Position.",
      steps: "1. Switch off the electrical source. 2. If unable, separate the victim using a dry wooden or plastic object. 3. Check breathing and pulse. 4. Begin CPR if required. 5. Seek emergency medical assistance immediately.",
      precautions: "Never touch a victim who is still in contact with electricity. Never use metal or wet objects to separate the victim from the power source."
    },
    {
      title: "Shock",
      keywords: ["shock, trauma, blood loss, low blood pressure, pale skin, cold skin, weak pulse, dizziness, emergency, bleeding, unconscious, injury, disaster, first aid, rescue, fainting, circulation, victim, collapse, medical emergency"],
      recoveryPosition: "Lay the person flat on their back and elevate the legs about 30 cm unless a head, neck, spinal, or leg injury is suspected.",
      steps: "1. Call emergency services. 2. Control severe bleeding. 3. Keep the person warm with a blanket. 4. Monitor breathing and pulse. 5. Reassure the victim until help arrives.",
      precautions: "Do not give food or drinks to an unconscious person or someone who may require surgery."
    },
    {
      title: "Unconsciousness",
      keywords: ["unconscious, fainting, no response, collapse, breathing, airway, CPR, recovery position, emergency, victim, first aid, accident, disaster, rescue, pulse, medical emergency, head injury, breathing difficulty, seizure, trauma"],
      recoveryPosition: "If breathing normally, place the person in the Recovery Position with the airway open.",
      steps: "1. Check for responsiveness. 2. Call emergency services. 3. Open the airway. 4. Check breathing for up to 10 seconds. 5. Begin CPR if there is no breathing.",
      precautions: "Never leave an unconscious person alone. Do not give food, water, or medication."
    },
    {
      title: "Cardiac Arrest (CPR)",
      keywords: ["cardiac arrest, CPR, heart stopped, chest compressions, rescue breaths, AED, no pulse, emergency, heart attack, collapse, unconscious, breathing stopped, circulation, rescue, first aid, lifesaving, emergency response, victim, compressions, defibrillator"],
      recoveryPosition: "Lay the person flat on a firm surface.",
      steps: "1. Call emergency services. 2. Begin chest compressions at the center of the chest. 3. Give rescue breaths if trained. 4. Use an AED if available. 5. Continue CPR until help arrives or the person recovers.",
      precautions: "Do not interrupt CPR unnecessarily. Ensure compressions are deep and consistent."
    },
    {
      title: "Heat Stroke",
      keywords: ["heat stroke, overheating, high temperature, sun exposure, hot weather, unconscious, dehydration, heat illness, dizziness, confusion, sweating, emergency, cooling, disaster, rescue, first aid, heat exhaustion, body temperature, collapse, summer"],
      recoveryPosition: "Move the person immediately to a cool shaded area.",
      steps: "1. Remove excess clothing. 2. Cool the body using wet towels or cool water. 3. Fan the person. 4. Call emergency services immediately. 5. Monitor breathing continuously.",
      precautions: "Do not give fluids to someone who is unconscious or confused."
    },
    {
      title: "Heat Exhaustion",
      keywords: ["heat exhaustion, dehydration, sweating, weakness, dizziness, nausea, hot weather, heat illness, fatigue, emergency, cooling, disaster, rescue, first aid, sun exposure, cramps, hydration, overheating, victim, collapse"],
      recoveryPosition: "Move the person to a cool shaded area and let them rest comfortably.",
      steps: "1. Loosen clothing. 2. Give cool water if fully conscious. 3. Apply cool wet cloths. 4. Allow the person to rest. 5. Seek medical care if symptoms worsen.",
      precautions: "Do not allow the person to return to strenuous activity until fully recovered."
    },
    {
      title: "Hypothermia",
      keywords: ["hypothermia, cold exposure, freezing, low body temperature, shivering, cold weather, floodwater, unconscious, rescue, blankets, warming, emergency, first aid, disaster, victim, cold injury, exposure, winter, survival, rescue operation"],
      recoveryPosition: "Move the person to a warm, dry place and wrap them in blankets.",
      steps: "1. Remove wet clothing carefully. 2. Cover with warm blankets. 3. Offer warm non-alcoholic drinks if conscious. 4. Warm the body gradually. 5. Seek medical attention.",
      precautions: "Do not rub the person's skin or expose them to sudden intense heat."
    },
    {
      title: "Dehydration",
      keywords: ["dehydration, thirst, dry mouth, weakness, dizziness, heat, diarrhea, vomiting, lack of water, emergency, hydration, ORS, disaster, flood, rescue, first aid, fatigue, hot weather, survival, illness"],
      recoveryPosition: "Move the person to a cool shaded place and allow them to rest.",
      steps: "1. Give small amounts of clean drinking water. 2. Use Oral Rehydration Solution (ORS) if available. 3. Monitor for worsening symptoms. 4. Seek medical help if severe.",
      precautions: "Avoid caffeinated or alcoholic drinks as they increase dehydration."
    },
    {
      title: "Snake Bite",
      keywords: ["snake bite, venom, poisonous snake, fang marks, swelling, wilderness, flood, rescue, emergency, first aid, bite, reptile, toxic, victim, pressure bandage, wildlife, disaster, outdoors, poison, survival"],
      recoveryPosition: "Keep the bitten limb below heart level and keep the person as still as possible.",
      steps: "1. Call emergency services. 2. Wash the wound gently. 3. Immobilize the limb. 4. Remove rings or tight clothing. 5. Transport the person to the nearest hospital.",
      precautions: "Do not suck the venom, cut the wound, or apply a tourniquet."
    },
    {
      title: "Insect Bite",
      keywords: ["insect bite, bee sting, wasp sting, mosquito bite, allergic reaction, swelling, itching, emergency, first aid, insect, bite, skin irritation, disaster, outdoors, rescue, allergy, pain, redness, sting, insects"],
      recoveryPosition: "Seat the person comfortably while monitoring for allergic reactions.",
      steps: "1. Wash the affected area. 2. Remove the stinger if visible. 3. Apply a cold compress. 4. Monitor breathing. 5. Seek medical help if severe allergic symptoms appear.",
      precautions: "Watch for swelling of the face or difficulty breathing, which may indicate anaphylaxis."
    },
    {
      title: "Animal Bite",
      keywords: ["animal bite, dog bite, cat bite, wild animal, rabies, bite wound, bleeding, infection, emergency, first aid, rescue, disaster, victim, wildlife, injury, hospital, wound care, animal attack, vaccination, outdoors"],
      recoveryPosition: "Keep the injured area elevated if possible while controlling bleeding.",
      steps: "1. Wash the wound with soap and clean water for at least 15 minutes. 2. Apply a sterile dressing. 3. Control bleeding. 4. Seek medical care immediately. 5. Report bites from wild or stray animals.",
      precautions: "Do not ignore even small bites, as they may transmit rabies or serious infections."
    },
    {
      title: "Eye Injury",
      keywords: ["eye injury, dust, debris, glass, chemical splash, foreign object, vision, eye pain, emergency, first aid, flood, earthquake, rescue, irritation, accident, injury, eye protection, swelling, bleeding, disaster"],
      recoveryPosition: "Keep the affected eye closed and avoid unnecessary movement.",
      steps: "1. Rinse with clean water if exposed to dust or chemicals. 2. Cover the eye loosely with sterile dressing. 3. Seek immediate medical attention. 4. Protect both eyes from unnecessary movement if a serious injury is suspected.",
      precautions: "Do not rub the eye or attempt to remove embedded objects."
    }, {
      title: "Chest Pain",
      keywords: ["chest pain, heart attack, heart problem, pressure chest, tightness, breathing difficulty, cardiac emergency, sweating, dizziness, pain arm, emergency, rescue, first aid, collapse, heart disease, unconscious, CPR, disaster, victim, ambulance"],
      recoveryPosition: "Help the person sit comfortably with their back supported and knees slightly bent.",
      steps: "1. Call emergency services immediately. 2. Keep the person calm and still. 3. Loosen tight clothing. 4. Monitor breathing and responsiveness. 5. Begin CPR if the person becomes unresponsive and stops breathing.",
      precautions: "Do not allow unnecessary walking or physical activity. Never ignore chest pain lasting more than a few minutes."
    },
    {
      title: "Panic Attack",
      keywords: ["panic attack, anxiety, fear, stress, hyperventilation, breathing fast, disaster trauma, earthquake fear, flood fear, emotional distress, emergency, reassurance, rescue, dizziness, shaking, nervousness, mental health, victim, calm breathing, anxiety attack"],
      recoveryPosition: "Move the person to a quiet and safe place where they can sit comfortably.",
      steps: "1. Stay calm and reassure the person. 2. Encourage slow, controlled breathing. 3. Remove them from crowds if possible. 4. Stay with them until symptoms improve. 5. Seek medical help if symptoms resemble a heart attack.",
      precautions: "Do not leave the person alone if they appear confused or extremely distressed."
    },
    {
      title: "Flash Flood",
      keywords: ["flash flood, rising water, heavy rain, floodwater, river overflow, evacuation, rescue, drowning, moving water, flood warning, emergency, survival, disaster, high ground, vehicle, road flooding, rainfall, flood safety, current, flood"],
      recoveryPosition: "Move immediately to the highest available ground away from rivers, streams, and drainage channels.",
      steps: "1. Evacuate immediately. 2. Avoid walking or driving through floodwater. 3. Follow official evacuation routes. 4. Carry your emergency kit. 5. Monitor emergency alerts.",
      precautions: "Never drive through moving water. Even shallow floodwater can sweep away people and vehicles."
    },
    {
      title: "River Flood",
      keywords: ["river flood, overflowing river, floodwater, riverbank, evacuation, water level, heavy rainfall, rescue, emergency, disaster, flooding, drowning, high ground, flood safety, river current, flood warning, community evacuation, survival, rising river, water"],
      recoveryPosition: "Move everyone to higher ground immediately and remain away from riverbanks.",
      steps: "1. Evacuate early if instructed. 2. Disconnect electricity if safe. 3. Move valuables to higher levels. 4. Follow emergency updates. 5. Stay away until authorities declare the area safe.",
      precautions: "Do not return home until floodwaters have completely receded and officials declare the area safe."
    },
    {
      title: "Urban Flooding",
      keywords: ["urban flooding, city flood, street flooding, drainage overflow, road flooding, stormwater, rescue, floodwater, emergency, disaster, evacuation, traffic, submerged roads, rainfall, infrastructure, flooding, high ground, safety, vehicle, flood"],
      recoveryPosition: "Move to the nearest safe building or elevated location.",
      steps: "1. Avoid flooded roads. 2. Turn off electricity if flooding enters your home. 3. Stay informed through official alerts. 4. Avoid manholes and drains hidden under water. 5. Evacuate if necessary.",
      precautions: "Floodwater may hide open drains, sharp objects, and electrical hazards."
    },
    {
      title: "Contaminated Flood Water",
      keywords: ["contaminated water, dirty floodwater, sewage, chemicals, bacteria, infection, polluted water, disease, skin infection, rescue, disaster, flood, hygiene, sanitation, illness, emergency, contamination, toxic water, floodwater, health"],
      recoveryPosition: "Wash exposed skin immediately with clean water and change into dry clothing.",
      steps: "1. Avoid direct contact with floodwater. 2. Wash exposed areas thoroughly. 3. Clean and disinfect wounds. 4. Wear waterproof boots and gloves if entering flooded areas. 5. Seek medical attention if signs of infection appear.",
      precautions: "Never allow children to play in contaminated floodwater."
    },
    {
      title: "Safe Drinking Water",
      keywords: ["safe drinking water, clean water, boil water, water purification, bottled water, chlorine, bleach, water safety, floodwater, contamination, hydration, emergency, disaster, survival, sanitation, clean supply, drinking water, purification tablets, health, hygiene"],
      recoveryPosition: "Store treated drinking water in clean, covered containers.",
      steps: "1. Boil water for at least one minute. 2. Use purification tablets if available. 3. Store water in clean containers. 4. Use bottled water if possible. 5. Discard contaminated water.",
      precautions: "Never drink water that smells unusual, is discolored, or may have been contaminated by floodwater."
    },
    {
      title: "Food Safety",
      keywords: ["food safety, spoiled food, contaminated food, flood food, food poisoning, refrigeration, cooking, canned food, emergency, disaster, hygiene, bacteria, rescue, health, survival, clean utensils, safe food, flood, illness, nutrition"],
      recoveryPosition: "Keep safe food separated from contaminated food.",
      steps: "1. Discard food exposed to floodwater. 2. Cook food thoroughly. 3. Wash utensils with clean water. 4. Refrigerate perishable food when electricity is available. 5. Wash hands before preparing food.",
      precautions: "Never consume food with unusual smell, color, or packaging damage."
    },
    {
      title: "Waterborne Diseases",
      keywords: ["waterborne disease, cholera, typhoid, diarrhea, dysentery, contaminated water, infection, bacteria, flood, emergency, dehydration, sanitation, hygiene, rescue, disease outbreak, illness, drinking water, parasites, virus, health"],
      recoveryPosition: "Keep the patient hydrated and resting comfortably.",
      steps: "1. Drink Oral Rehydration Solution (ORS). 2. Continue drinking safe water. 3. Maintain good hygiene. 4. Seek medical attention if symptoms worsen. 5. Avoid contaminated food and water.",
      precautions: "Wash hands frequently and avoid untreated water during floods."
    },
    {
      title: "Earthquake (Indoor)",
      keywords: ["earthquake indoor, shaking, drop cover hold on, building, furniture, earthquake safety, tremor, collapse, emergency, disaster, rescue, indoors, table, falling objects, protection, shelter, earthquake drill, survival, shaking building, safety"],
      recoveryPosition: "Stay inside and protect yourself under sturdy furniture until the shaking completely stops.",
      steps: "1. DROP to your hands and knees. 2. COVER your head and neck under a sturdy table. 3. HOLD ON until the shaking stops. 4. Stay away from windows. 5. Evacuate carefully after shaking ends if the building is unsafe.",
      precautions: "Do not run outside while the ground is shaking. Avoid elevators."
    },
    {
      title: "Earthquake (Outdoor)",
      keywords: ["earthquake outdoor, open area, shaking, falling debris, utility wires, buildings, tremor, emergency, disaster, rescue, survival, evacuation, earthquake safety, roads, bridges, streetlights, outdoors, protection, ground shaking, hazard"],
      recoveryPosition: "Move to an open area away from buildings, trees, bridges, and power lines.",
      steps: "1. Stop moving. 2. Go to the nearest open area. 3. Protect your head and neck. 4. Stay there until the shaking stops. 5. Watch for falling debris and damaged structures.",
      precautions: "Stay away from buildings, utility poles, and bridges that may collapse."
    },
    {
      title: "Aftershock",
      keywords: ["aftershock, secondary earthquake, repeated shaking, damaged building, tremor, earthquake, collapse, emergency, rescue, disaster, structural damage, evacuation, survival, safety, debris, building inspection, earthquake warning, ground shaking, risk, hazard"],
      recoveryPosition: "Move to a safe open area if your building has been damaged.",
      steps: "1. Expect additional shaking. 2. Drop, Cover, and Hold On if indoors. 3. Stay away from damaged buildings. 4. Check for injuries. 5. Follow official emergency instructions.",
      precautions: "Do not re-enter damaged buildings until they have been inspected and declared safe."
    }, {
      title: "Building Collapse",
      keywords: ["building collapse, collapsed building, trapped, rubble, debris, earthquake, structural failure, rescue, emergency, disaster, victim, dust, broken concrete, survival, evacuation, crushed, damaged building, collapse, search, rescue team"],
      recoveryPosition: "If trapped, remain still, protect your airway, and conserve energy. If assisting someone, move them only if there is immediate danger.",
      steps: "1. Call emergency services. 2. Avoid entering unstable structures. 3. Listen for trapped victims. 4. Cover your mouth and nose with cloth if trapped. 5. Signal rescuers by tapping on pipes or walls.",
      precautions: "Do not use open flames inside collapsed buildings due to possible gas leaks. Never enter heavily damaged structures without authorization."
    },
    {
      title: "Falling Debris",
      keywords: ["falling debris, broken glass, concrete, bricks, roof collapse, earthquake, landslide, flying objects, injury, rescue, emergency, disaster, hard hat, head injury, falling objects, danger, rubble, protection, accident, impact"],
      recoveryPosition: "Move to a protected area away from windows, walls, and unstable structures.",
      steps: "1. Cover your head and neck. 2. Move carefully to a safe location. 3. Check for injuries. 4. Assist others if safe. 5. Report hazardous structures.",
      precautions: "Never stand near damaged buildings or walls that may collapse unexpectedly."
    },
    {
      title: "Gas Leak",
      keywords: ["gas leak, LPG, natural gas, gas smell, explosion, fire, earthquake, damaged pipeline, emergency, evacuation, rescue, hazard, flammable gas, safety, leak detection, utility, disaster, ventilation, ignition, explosion risk"],
      recoveryPosition: "Leave the building immediately and move to a safe distance outdoors.",
      steps: "1. Open doors and windows if safe. 2. Evacuate everyone. 3. Shut off the gas supply if trained. 4. Call emergency services from outside. 5. Prevent others from entering.",
      precautions: "Do not use electrical switches, phones, candles, or anything that may create a spark inside the building."
    },
    {
      title: "Fire After Earthquake",
      keywords: ["fire, earthquake fire, flames, smoke, gas explosion, electrical fire, emergency, rescue, evacuation, extinguisher, burning building, disaster, hazard, smoke inhalation, heat, fire safety, ignition, emergency response, burn, evacuation route"],
      recoveryPosition: "Evacuate immediately using the nearest safe exit and remain outside.",
      steps: "1. Activate the fire alarm if available. 2. Evacuate immediately. 3. Crawl below smoke if necessary. 4. Use a fire extinguisher only for very small fires. 5. Call emergency services.",
      precautions: "Never use elevators during a fire. Never re-enter a burning building."
    },
    {
      title: "Power Outage",
      keywords: ["power outage, blackout, electricity failure, generator, flashlight, emergency lighting, electrical safety, disaster, earthquake, flood, rescue, batteries, utility, communication, outage, survival, emergency kit, lighting, power failure, safety"],
      recoveryPosition: "Stay indoors if safe and use battery-powered lighting.",
      steps: "1. Use flashlights instead of candles. 2. Unplug sensitive electronics. 3. Keep refrigerator doors closed. 4. Listen to emergency broadcasts. 5. Report damaged power lines.",
      precautions: "Never touch fallen electrical wires or use generators indoors."
    },
    {
      title: "Landslide",
      keywords: ["landslide, slope failure, mud, rocks, hillside collapse, mountain, earthquake, heavy rain, debris flow, evacuation, disaster, rescue, emergency, unstable ground, flooding, hazard, soil movement, survival, landslip, warning"],
      recoveryPosition: "Move immediately to stable ground away from the landslide path.",
      steps: "1. Evacuate the danger area. 2. Stay away from river channels. 3. Listen for official warnings. 4. Help injured people if safe. 5. Report blocked roads and damaged infrastructure.",
      precautions: "Do not cross active landslide zones or stand near unstable slopes."
    },
    {
      title: "Mudslide",
      keywords: ["mudslide, mud flow, debris flow, hillside, heavy rain, flooding, landslide, rescue, disaster, emergency, evacuation, soil movement, hazard, muddy water, trapped, survival, slope failure, rainstorm, road blockage, danger"],
      recoveryPosition: "Move quickly to higher and stable ground away from flowing mud.",
      steps: "1. Evacuate immediately. 2. Avoid valleys and drainage channels. 3. Follow evacuation routes. 4. Listen for emergency alerts. 5. Assist others if safe.",
      precautions: "Never attempt to walk or drive through a moving mudslide."
    },
    {
      title: "Evacuation Procedure",
      keywords: ["evacuation, escape route, emergency exit, disaster response, flood evacuation, earthquake evacuation, emergency plan, safety, rescue, shelter, evacuation center, emergency bag, family plan, warning, siren, survival, assembly point, relocation, emergency route, preparedness"],
      recoveryPosition: "Remain calm and proceed to the designated safe location.",
      steps: "1. Follow official evacuation orders. 2. Carry your emergency kit. 3. Assist children, elderly, and people with disabilities. 4. Lock your home if time permits. 5. Proceed to the nearest safe shelter.",
      precautions: "Do not delay evacuation to collect valuables or unnecessary belongings."
    },
    {
      title: "Emergency Shelter",
      keywords: ["emergency shelter, relief camp, evacuation center, temporary shelter, disaster relief, food, water, medical aid, rescue, accommodation, safety, emergency housing, flood shelter, earthquake shelter, humanitarian aid, survival, sanitation, registration, family reunification, assistance"],
      recoveryPosition: "Register at the shelter and follow staff instructions.",
      steps: "1. Register upon arrival. 2. Follow shelter rules. 3. Keep personal belongings secure. 4. Maintain hygiene. 5. Report medical needs immediately.",
      precautions: "Avoid overcrowding exits and always follow shelter management instructions."
    },
    {
      title: "Emergency Kit",
      keywords: ["emergency kit, survival kit, go bag, first aid kit, flashlight, batteries, water, food, radio, medicines, documents, emergency supplies, disaster preparedness, rescue, earthquake, flood, blanket, whistle, power bank, hygiene kit"],
      recoveryPosition: "Keep the emergency kit in an easily accessible location.",
      steps: "1. Pack drinking water. 2. Pack non-perishable food. 3. Include medicines and first aid supplies. 4. Add flashlight, batteries, whistle, radio, and power bank. 5. Store important documents in waterproof bags.",
      precautions: "Inspect and update the emergency kit regularly by replacing expired items."
    },
    {
      title: "Missing Person",
      keywords: ["missing person, lost family, missing child, disaster victim, search, rescue, identification, photograph, reporting, emergency, earthquake, flood, evacuation, reunification, NGO, police, relief center, survivor, family, assistance"],
      recoveryPosition: "Remain calm and gather accurate information before reporting.",
      steps: "1. Check nearby shelters and hospitals. 2. Report the missing person through the app. 3. Provide a recent photograph and description. 4. Contact local authorities. 5. Update the report if new information becomes available.",
      precautions: "Avoid sharing sensitive personal information publicly outside trusted channels."
    },
    {
      title: "Search and Rescue",
      keywords: ["search and rescue, SAR, trapped victim, rescue team, disaster response, emergency services, collapsed building, missing person, evacuation, first responder, flood rescue, earthquake rescue, helicopter, canine unit, emergency operation, survivor, rubble, coordination, relief, recovery"],
      recoveryPosition: "Stay in a safe location unless instructed otherwise by rescue personnel.",
      steps: "1. Contact emergency services. 2. Mark the victim's last known location. 3. Avoid entering unsafe structures. 4. Follow instructions from rescue teams. 5. Provide accurate information to responders.",
      precautions: "Do not perform dangerous rescue attempts without proper equipment or training."
    }
  ];

  console.log("Seeding rescue conditions...");

  for (const c of conditions) {
    await prisma.condition.upsert({
      where: {
        title: c.title,
      },
      update: {
        keywords: c.keywords,
        recoveryPosition: c.recoveryPosition,
        steps: c.steps,
        precautions: c.precautions,
      },
      create: {
        title: c.title,
        keywords: c.keywords,
        recoveryPosition: c.recoveryPosition,
        steps: c.steps,
        precautions: c.precautions,
      },
    });
  }

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
