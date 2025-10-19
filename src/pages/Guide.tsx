export default function Guide() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id="guide-page">
      <div className="text-center mb-8" id="guide-intro">
        <h1 className="text-2xl font-bold text-gray-900 mb-4" id="guide-title">
          Fieldcraft Survival Guide
        </h1>
        <p className="text-lg text-gray-600" id="guide-subtitle">
          Practical tips for staying mission-ready outdoors—water, food, shelter, and decisive action.
        </p>
      </div>

      <div className="grid gap-8" id="guide-sections">
        <div className="card p-6" id="guide-water">
          <h2 className="text-xl font-semibold mb-4" id="guide-water-heading">
            Hydration & Water Sourcing
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-water-faq">
            <div id="guide-water-faq-1">
              <dt className="font-medium text-gray-900" id="guide-water-question-1">
                Q: How do I prioritize water when resources are limited?
              </dt>
              <dd id="guide-water-answer-1">
                A: Aim for at least 3 liters per person per day. Filter or boil surface water and supplement with purification tablets. Ration carefully but never skip hydration entirely.
              </dd>
            </div>
            <div id="guide-water-faq-2">
              <dt className="font-medium text-gray-900" id="guide-water-question-2">
                Q: What signs indicate dehydration in the field?
              </dt>
              <dd id="guide-water-answer-2">
                A: Early signals include headache, dizziness, and dark urine. Escalate hydration immediately and consider electrolyte supplements to stabilize.
              </dd>
            </div>
            <div id="guide-water-faq-3">
              <dt className="font-medium text-gray-900" id="guide-water-question-3">
                Q: How can I collect water in an emergency?
              </dt>
              <dd id="guide-water-answer-3">
                A: Use tarps or ponchos to gather rain, set up solar stills, or follow animal trails to locate creeks. Always purify before consumption.
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6" id="guide-food">
          <h2 className="text-xl font-semibold mb-4" id="guide-food-heading">
            Field Nutrition & Food Security
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-food-faq">
            <div id="guide-food-faq-1">
              <dt className="font-medium text-gray-900" id="guide-food-question-1">
                Q: What should I pack for sustained energy?
              </dt>
              <dd id="guide-food-answer-1">
                A: Prioritize lightweight, calorie-dense items: jerky, nuts, dehydrated meals, and electrolyte drink mixes. Rotate stock to keep supplies fresh.
              </dd>
            </div>
            <div id="guide-food-faq-2">
              <dt className="font-medium text-gray-900" id="guide-food-question-2">
                Q: How do I safely cook in the field?
              </dt>
              <dd id="guide-food-answer-2">
                A: Use a compact stove or establish a low-profile fire ring with cleared ground. Keep fuel dry, maintain a safe distance from tents, and extinguish thoroughly.
              </dd>
            </div>
            <div id="guide-food-faq-3">
              <dt className="font-medium text-gray-900" id="guide-food-question-3">
                Q: Can I forage if rations run low?
              </dt>
              <dd id="guide-food-answer-3">
                A: Only forage if you are trained. Improper identification can be lethal. When unsure, stick to packed provisions or fishing/hunting where lawful.
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6" id="guide-shelter">
          <h2 className="text-xl font-semibold mb-4" id="guide-shelter-heading">
            Shelter, Clothing & Heat Management
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-shelter-faq">
            <div id="guide-shelter-faq-1">
              <dt className="font-medium text-gray-900" id="guide-shelter-question-1">
                Q: How do I pick a safe shelter site?
              </dt>
              <dd id="guide-shelter-answer-1">
                A: Choose high, dry ground away from flood zones, deadfall, and avalanche paths. Clear debris and set windbreaks with natural cover.
              </dd>
            </div>
            <div id="guide-shelter-faq-2">
              <dt className="font-medium text-gray-900" id="guide-shelter-question-2">
                Q: What layering strategy keeps me mission-ready?
              </dt>
              <dd id="guide-shelter-answer-2">
                A: Use moisture-wicking base layers, insulating mid-layers, and waterproof shells. Adjust layers to prevent sweat buildup and maintain core temperature.
              </dd>
            </div>
            <div id="guide-shelter-faq-3">
              <dt className="font-medium text-gray-900" id="guide-shelter-question-3">
                Q: How do I manage cold exposure overnight?
              </dt>
              <dd id="guide-shelter-answer-3">
                A: Insulate from the ground with pads or evergreen boughs, use rated sleeping systems, and vent shelters to reduce condensation. Monitor extremities for frostbite.
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6" id="guide-decisions">
          <h2 className="text-xl font-semibold mb-4" id="guide-decisions-heading">
            Relocate or Shelter in Place?
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-decisions-faq">
            <div id="guide-decisions-faq-1">
              <dt className="font-medium text-gray-900" id="guide-decisions-question-1">
                Q: When should I bug out?
              </dt>
              <dd id="guide-decisions-answer-1">
                A: Relocate when immediate threats (fire, flooding, hostile activity) exceed the safety of your current location. Move with a plan, comms, and rally points.
              </dd>
            </div>
            <div id="guide-decisions-faq-2">
              <dt className="font-medium text-gray-900" id="guide-decisions-question-2">
                Q: When is it better to hunker down?
              </dt>
              <dd id="guide-decisions-answer-2">
                A: Shelter in place when conditions are stable, you have supplies, and external hazards are uncertain. Fortify shelter, ration resources, and maintain situational awareness.
              </dd>
            </div>
            <div id="guide-decisions-faq-3">
              <dt className="font-medium text-gray-900" id="guide-decisions-question-3">
                Q: How do I decide quickly under pressure?
              </dt>
              <dd id="guide-decisions-answer-3">
                A: Use the METT-TC framework (Mission, Enemy, Terrain, Troops, Time, Civilian considerations). Evaluate, decide, and communicate to your team without delay.
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-accent p-4 rounded-lg border border-primary text-sm text-gray-600 leading-relaxed" id="guide-disclaimer">
          <strong className="text-primary" id="guide-disclaimer-label">Situational Awareness:</strong>{" "}
          Field conditions shift rapidly. Pair these tips with local regulations, weather alerts, and professional training to maintain operational safety.
        </div>
      </div>
    </div>
  );
}
