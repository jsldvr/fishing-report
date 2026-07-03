export default function Guide() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id="guide-page">
      <div className="text-center mb-8" id="guide-intro">
        <h1 className="text-2xl font-bold text-gray-900 mb-4" id="guide-title">
          Field safety guide
        </h1>
        <p className="text-lg text-gray-600" id="guide-subtitle">
          Practical tips for staying safe on the water and in the field.
        </p>
      </div>

      <div className="grid gap-8" id="guide-sections">
        <div className="card p-6" id="guide-water">
          <h2 className="text-xl font-semibold mb-4" id="guide-water-heading">
            Staying Hydrated
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-water-faq">
            <div id="guide-water-faq-1">
              <dt className="font-medium text-gray-900" id="guide-water-question-1">
                Q: How much water should I bring for a day on the water?
              </dt>
              <dd id="guide-water-answer-1">
                A: Plan on at least 3 liters per person for a full day, more in hot weather. Bring extra rather than relying on finding a source nearby.
              </dd>
            </div>
            <div id="guide-water-faq-2">
              <dt className="font-medium text-gray-900" id="guide-water-question-2">
                Q: What are the early signs of dehydration?
              </dt>
              <dd id="guide-water-answer-2">
                A: Headache, dizziness, and dark urine are early signals. Rehydrate right away and consider an electrolyte drink if you've been out in the heat.
              </dd>
            </div>
            <div id="guide-water-faq-3">
              <dt className="font-medium text-gray-900" id="guide-water-question-3">
                Q: What if I run out of drinking water in the field?
              </dt>
              <dd id="guide-water-answer-3">
                A: Filter or boil any water source before drinking it, or use purification tablets. Never drink untreated surface water.
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6" id="guide-food">
          <h2 className="text-xl font-semibold mb-4" id="guide-food-heading">
            Food & Snacks
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-food-faq">
            <div id="guide-food-faq-1">
              <dt className="font-medium text-gray-900" id="guide-food-question-1">
                Q: What should I pack for sustained energy?
              </dt>
              <dd id="guide-food-answer-1">
                A: Lightweight, calorie-dense snacks travel well: jerky, nuts, trail mix, and dried fruit. Rotate your stock so nothing goes stale.
              </dd>
            </div>
            <div id="guide-food-faq-2">
              <dt className="font-medium text-gray-900" id="guide-food-question-2">
                Q: How do I safely cook or eat at the shore?
              </dt>
              <dd id="guide-food-answer-2">
                A: Use a compact stove or a small, contained fire ring away from dry brush. Keep fuel dry, keep a safe distance from gear, and put it out completely when done.
              </dd>
            </div>
            <div id="guide-food-faq-3">
              <dt className="font-medium text-gray-900" id="guide-food-question-3">
                Q: Can I keep my catch if I forgot a cooler?
              </dt>
              <dd id="guide-food-answer-3">
                A: Keep fish cool and out of direct sun; a shaded stringer in the water works short-term. Get it on ice as soon as you can to keep it safe to eat.
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6" id="guide-shelter">
          <h2 className="text-xl font-semibold mb-4" id="guide-shelter-heading">
            Clothing & Weather Protection
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-shelter-faq">
            <div id="guide-shelter-faq-1">
              <dt className="font-medium text-gray-900" id="guide-shelter-question-1">
                Q: How do I pick a safe spot to fish from shore?
              </dt>
              <dd id="guide-shelter-answer-1">
                A: Choose stable, dry ground above the waterline and clear of loose rock or overhanging deadfall. Avoid low banks that could flood if water rises.
              </dd>
            </div>
            <div id="guide-shelter-faq-2">
              <dt className="font-medium text-gray-900" id="guide-shelter-question-2">
                Q: What should I wear for changing weather?
              </dt>
              <dd id="guide-shelter-answer-2">
                A: Layer up: a moisture-wicking base layer, an insulating mid-layer, and a waterproof outer shell. Add or remove layers before you start sweating or getting chilled.
              </dd>
            </div>
            <div id="guide-shelter-faq-3">
              <dt className="font-medium text-gray-900" id="guide-shelter-question-3">
                Q: How do I avoid getting too cold on the water?
              </dt>
              <dd id="guide-shelter-answer-3">
                A: Wet clothing loses heat fast, so pack a dry backup layer. Watch for numbness or shivering and head in early if either shows up.
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6" id="guide-decisions">
          <h2 className="text-xl font-semibold mb-4" id="guide-decisions-heading">
            When to Head In
          </h2>
          <dl className="space-y-4 text-sm text-gray-600 leading-relaxed" id="guide-decisions-faq">
            <div id="guide-decisions-faq-1">
              <dt className="font-medium text-gray-900" id="guide-decisions-question-1">
                Q: What conditions mean it's time to leave?
              </dt>
              <dd id="guide-decisions-answer-1">
                A: Lightning, sudden wind shifts, rapidly rising water, or a safety rating of Poor or Dangerous in the forecast all mean it's time to pack up.
              </dd>
            </div>
            <div id="guide-decisions-faq-2">
              <dt className="font-medium text-gray-900" id="guide-decisions-question-2">
                Q: When is it fine to wait out changing weather?
              </dt>
              <dd id="guide-decisions-answer-2">
                A: If conditions are stable and forecast to stay that way, and you have shelter and supplies, it's reasonable to wait it out. Keep checking the forecast.
              </dd>
            </div>
            <div id="guide-decisions-faq-3">
              <dt className="font-medium text-gray-900" id="guide-decisions-question-3">
                Q: How do I decide quickly when conditions turn?
              </dt>
              <dd id="guide-decisions-answer-3">
                A: Check the current safety rating, note the nearest safe access point, and tell someone your plan before you go. When in doubt, head in.
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-accent p-4 rounded-lg border border-primary text-sm text-gray-600 leading-relaxed" id="guide-disclaimer">
          <strong className="text-primary" id="guide-disclaimer-label">Stay aware:</strong>{" "}
          Conditions change quickly. Pair these tips with local regulations, official weather alerts, and professional training.
        </div>
      </div>
    </div>
  );
}
