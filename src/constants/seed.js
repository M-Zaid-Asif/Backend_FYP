import { PrismaClient } from '../../generated/prisma/index.js';
import prisma from './prisma.js';

async function main() {
  const conditions = [
    {
      title: "Drowning",
      recoveryPosition: "Lay the person on their back on a flat surface. If they are breathing but unconscious, use the Recovery Position (on their side) to keep the airway clear.",
      steps: "1. Open the airway by tilting the head back. 2. Give 5 initial rescue breaths. 3. Perform 30 chest compressions. 4. Repeat 2 breaths / 30 compressions until help arrives.",
      precautions: "Do not attempt to 'drain the water' by pressing the stomach; this causes vomiting and choking."
    },
    {
      title: "Choking",
      recoveryPosition: "Stand behind the person for the Heimlich Maneuver.",
      steps: "1. Give 5 sharp back blows between shoulder blades. 2. Give 5 abdominal thrusts (pulling inward and upward). 3. Repeat until object is cleared.",
      precautions: "Never perform abdominal thrusts on a person who is still coughing or speaking."
    },
    {
      title: "Severe Bleeding",
      recoveryPosition: "Lay the person down and elevate the injured limb above heart level.",
      steps: "1. Apply firm, direct pressure with a clean cloth. 2. Wrap a tight bandage over the cloth. 3. If it soaks through, add more cloth without removing the first.",
      precautions: "Do not remove the original cloth as it may disturb the clot."
    },
    {
      title: "Electrocution",
      recoveryPosition: "Ensure the victim is no longer touching the power source before touching them.",
      steps: "1. Turn off the power source. 2. If unable, move the person with a dry wooden stick. 3. Check for pulse and breathing.",
      precautions: "Never use a metal or damp object to move the victim."
    },
    {
      title: "Heat Stroke",
      recoveryPosition: "Move the person to a cool, shaded area immediately.",
      steps: "1. Loosen or remove tight clothing. 2. Apply cool, wet cloths to neck, armpits, and groin. 3. Fan the person vigorously.",
      precautions: "Do not give fluids if the person is confused or unconscious."
    },
    {
      title: "Hypothermia",
      recoveryPosition: "Move to a dry area and replace wet clothes with dry blankets.",
      steps: "1. Wrap the chest and groin first. 2. Give warm, sweet non-alcoholic drinks if conscious. 3. Keep them still to conserve energy.",
      precautions: "Do not rub or massage the skin; it can cause cardiac arrest."
    },
    {
      title: "Unconsciousness",
      recoveryPosition: "Always use the Recovery Position (on their side) to keep the airway open.",
      steps: "1. Check for response (shout/shake). 2. Tilt head back to check breathing. 3. If breathing, roll to side.",
      precautions: "Do not leave the person on their back if they are unconscious but breathing."
    },
    {
      title: "Fractures",
      recoveryPosition: "Keep the injured limb as still as possible.",
      steps: "1. Support the limb with a splint (wood/cardboard). 2. Use a cloth to tie the splint securely. 3. Check for warmth/color in the limb.",
      precautions: "Do not try to 'straighten' or push a bone back into place."
    },
    {
      title: "Head Injury",
      recoveryPosition: "Keep the person lying down with head and shoulders slightly raised.",
      steps: "1. Stop any bleeding with light pressure. 2. Monitor for vomiting or confusion. 3. Keep them awake and talking.",
      precautions: "Do not allow the person to sleep if they seem confused or disoriented."
    },
    {
      title: "Crush Injury",
      recoveryPosition: "Keep the person calm and warm while waiting for rescue teams.",
      steps: "1. If trapped for >15 mins, do NOT remove the weight suddenly. 2. Control bleeding. 3. Monitor breathing.",
      precautions: "Sudden release of weight can cause 'Crush Syndrome,' which can be fatal."
    },
    {
      title: "Snake/Insect Bite",
      recoveryPosition: "Keep the bitten area below the level of the heart.",
      steps: "1. Keep the person very still. 2. Wash the area with soap and water. 3. Note the appearance of the snake if possible.",
      precautions: "Do not try to suck out the venom or use a tourniquet."
    },
    {
      title: "Burn Injury",
      recoveryPosition: "Hold the burned area under cool (not cold) running water.",
      steps: "1. Cool the burn for at least 10 minutes. 2. Remove jewelry near the burn before it swells. 3. Cover loosely with clean plastic wrap.",
      precautions: "Do not use ice, butter, or ointments on a fresh burn."
    },
    {
      title: "Earthquake (Indoor)",
      recoveryPosition: "Stay inside until the shaking stops.",
      steps: "1. DROP to your hands and knees. 2. COVER your head under a sturdy table. 3. HOLD ON until shaking stops.",
      precautions: "Avoid windows, mirrors, and hanging objects."
    },
    {
      title: "Earthquake (Outdoor)",
      recoveryPosition: "Move away from buildings, streetlights, and utility wires.",
      steps: "1. Find a clear, open spot. 2. Drop to the ground. 3. Protect your head with your arms.",
      precautions: "Do not run inside a building while it is still shaking."
    },
    {
      title: "Flash Flood",
      recoveryPosition: "Move to the highest ground possible immediately.",
      steps: "1. Avoid low-lying areas and river banks. 2. If water rises, climb to the roof. 3. Take an emergency kit.",
      precautions: "Never drive through moving water; 6 inches can sweep a car away."
    },
    {
      title: "Gas Leak",
      recoveryPosition: "Leave the building immediately and stay far away.",
      steps: "1. Open all doors and windows if safe. 2. Do NOT use any electronics or switches. 3. Call for help from outside.",
      precautions: "Do not use a phone or flashlight inside a building with a leak."
    },
    {
      title: "Water Safety",
      recoveryPosition: "Assume all floodwater is contaminated with sewage or chemicals.",
      steps: "1. Boil water for at least 1 minute. 2. Use 8 drops of bleach per gallon if no fire. 3. Let it sit for 30 minutes.",
      precautions: "Do not drink water that smells like chemicals or is discolored."
    },
    {
      title: "Submit Report",
      recoveryPosition: "Ensure you are in a safe location before using your phone.",
      steps: "1. Open the App. 2. Click 'Submit Report.' 3. Take a photo and allow GPS access. 4. Select the disaster type.",
      precautions: "Do not stop in a dangerous zone just to submit a report."
    },
    {
      title: "Find an NGO",
      recoveryPosition: "Use the map to find verified resource centers nearby.",
      steps: "1. Open 'View Maps.' 2. Filter for 'NGO Centers.' 3. Check for available resources (Food/Water).",
      precautions: "Verify the NGO's status via the green checkmark in the app."
    },
    {
      title: "Missing Person",
      recoveryPosition: "Gather a physical description and the last known location.",
      steps: "1. Check the 'Missing Persons' board in-app. 2. Post a report with a clear photo. 3. Contact local relief centers.",
      precautions: "Avoid sharing your private phone number publicly; use in-app chat."
    }
  ];

  console.log("Seeding rescue conditions...");

  for (const c of conditions) {
    await prisma.condition.upsert({
      where: { title: c.title },
      update: {
        recoveryPosition: c.recoveryPosition,
        steps: c.steps,
        precautions: c.precautions
      },
      create: c,
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
