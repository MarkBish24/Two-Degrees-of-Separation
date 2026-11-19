// The write-up at the bottom of the page.

export default function Writeup() {
  return (
    <article className="writeup">
      <h2>Write-up</h2>

      <section>
        <h3>The question</h3>
        <p>
          Climate change doesn't affect just one part of the world. It affects
          the whole planet, which is why it's called "global" warming.
          However, just because it affects the whole world doesn't mean every
          place is affected equally. Some places are warming up much faster
          than others. We wanted to see how much each city across the world
          heats up, and, depending on which future we end up in, how fast and
          how high those temperatures can get.
        </p>
      </section>

      <section>
        <h3>The data</h3>
        <p>
          Our data comes from a climate model called CESM2-WACCM, made by the
          National Center for Atmospheric Research. The first part of the data
          (1850 to 2014) is the model recreating the past, using real-world
          records like greenhouse gas levels and volcanic eruptions. The rest
          is simulated: the model plays out three possible futures that
          stretch out to 2100.
        </p>
        <ul>
          <li><strong>SSP1-2.6:</strong> the world cuts emissions quickly.</li>
          <li><strong>SSP2-4.5:</strong> emissions follow a middle path.</li>
          <li><strong>SSP5-8.5:</strong> emissions keep growing fast.</li>
        </ul>
        <p>
          We used Python to turn the monthly numbers into yearly averages.
          Then, for every spot on the map, we subtracted that spot's own
          average from 1850 to 1900. That way, every color means "this much
          warmer (or cooler) than this place used to be."
        </p>
      </section>

      <section>
        <h3>Design choices</h3>
        <ul>
          <li>
            <strong>Why a globe?</strong> Part of the reason we chose a globe
            instead of a 2D map was to be innovative. Other students in our
            class have used this data, so we wanted to show it in a more unique
            way. Also, the biggest changes happen around the poles, and a flat
            map that gets cut off at the edges makes it harder to compare those
            changes with the rest of the world. Since you can spin the globe to
            either side, it's easier to see everything in relation to
            everything else.
          </li>
          <li>
            <strong>Why red and blue?</strong> We picked red and blue because
            they're intuitive: red signals hotter, blue signals cooler, and
            white means there's no change. We kept it to just two colors so
            the map still works for people who are colorblind.
          </li>
          <li>
            <strong>Why boxes?</strong> We chose a grid of boxes to show the
            data more clearly instead of blending it into a smooth picture.
            Boxes also make it easier to hover over specific areas and cities
            and get exact numbers.
          </li>
          <li>
            <strong>Why a 20-year average?</strong> We used a 20-year average
            to decide when a place reaches 2 °C, because any single year can be
            unusually hot or cold just by chance.
          </li>
          <li>
            <strong>Why shades of one color for the futures?</strong> The three
            futures go from less pollution to more, so we used a single red
            that gets darker as emissions go up.
          </li>
        </ul>
      </section>

      <section>
        <h3>What we found</h3>
        <ul>
          <li>
            The world as a whole reaches 2 °C by around 2040 in all three
            futures, so in this model, changes made in the near future can't
            stop that from happening. The big difference comes by the end of
            the century: the world ends up about 2.4 °C warmer in the best-case
            future, but nearly 6 °C warmer in the worst.
          </li>
          <li>
            The poles and land seem to warm up much faster than the ocean. The
            Arctic was already past 2 °C in the 1990s.
          </li>
          <li>
            Different cities have very different futures depending on the
            timeline. For example, if we cut emissions, Mumbai ends up only
            about 2 °C warmer, but in the high-emissions future it's almost
            6 °C warmer.
          </li>
        </ul>
      </section>

      <section>
        <h3>Limitations</h3>
        <ul>
          <li>
            This is only one climate model and one run, so it shows one
            possible future, not a prediction. This model also tends to warm a
            bit more than most other models.
          </li>
          <li>
            Each box covers hundreds of miles, so "New York" really means the
            box New York sits in, which also includes part of the ocean.
          </li>
          <li>
            In the early 2000s, the three futures look almost the same, and the
            low-emissions one even warms slightly faster at first. That's mostly
            just random variation in this single run.
          </li>
        </ul>
      </section>
    </article>
  );
}
