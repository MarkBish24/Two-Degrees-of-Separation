// The write-up at the bottom of the page. Numbers quoted here come from the
// CESM2-WACCM data, using 4.5° x 6° boxes and 20-year averages.

export default function Writeup() {
  return (
    <article className="writeup">
      <h2>Write-up</h2>

      <section>
        <h3>The question</h3>
        <p>
          Climate goals are usually about the whole planet, like keeping
          global warming under 2 °C. But nobody lives in "the global average."
          Some places warm much faster than others. We wanted to show{" "}
          <strong>when different cities reach 2 °C of warming</strong>, and how
          much that depends on how much we pollute in the future.
        </p>
      </section>

      <section>
        <h3>The data</h3>
        <p>
          Our data comes from a climate model called CESM2-WACCM, made by the
          National Center for Atmospheric Research. It's part of CMIP6, a
          large set of climate simulations that scientists around the world
          share. We used its monthly air temperature near the ground. The
          model simulates the past from 1850 to 2014, then three possible
          futures out to 2100:
        </p>
        <ul>
          <li><strong>SSP1-2.6:</strong> the world cuts emissions quickly.</li>
          <li><strong>SSP2-4.5:</strong> emissions follow a middle path.</li>
          <li><strong>SSP5-8.5:</strong> emissions keep growing fast.</li>
        </ul>
        <p>
          We used Python to turn the monthly numbers into yearly averages.
          Then, for every spot on the map, we subtracted that spot's own
          average from 1850 to 1900. So every color means "this much warmer
          (or cooler) than this place used to be."
        </p>
      </section>

      <section>
        <h3>Design choices</h3>
        <ul>
          <li>
            <strong>Why a globe?</strong> Flat maps stretch some parts of the
            world, especially near the poles, which is where warming is
            strongest. A globe shows every place at its real size, and you can
            spin it to find your part of the world. Since you can only see one
            side of a globe at a time, we added the line chart underneath to
            show the full timeline.
          </li>
          <li>
            <strong>Why red and blue?</strong> Red means warmer, blue means
            cooler, and white means no change. We avoided rainbow colors
            because they're hard to read in order and don't work well for
            people who are colorblind.
          </li>
          <li>
            <strong>Why boxes?</strong> The model can't see details smaller
            than its grid, so we show the data as boxes instead of blending it
            into a smooth picture. The boxes also make it easy to hover and
            read the exact number.
          </li>
          <li>
            <strong>Why a 20-year average?</strong> Any one year can be
            unusually hot or cold just by chance. Averaging over 20 years shows
            the real trend. We say a place "reaches 2 °C" in the first year its
            20-year average hits 2 °C. You can turn the averaging off to see
            the yearly ups and downs.
          </li>
          <li>
            <strong>Why shades of one color for the scenarios?</strong> The
            three futures go from less to more pollution, so we used one red
            that gets darker as emissions go up.
          </li>
          <li>
            <strong>Terrain, ocean shine and stars</strong> are just there to
            make the globe easier to recognize. They aren't data. You can turn
            the terrain and shine down to zero if they get in the way.
          </li>
        </ul>
      </section>

      <section>
        <h3>What we found</h3>
        <ul>
          <li>
            <strong>The world as a whole reaches 2 °C around 2035 to
            2040</strong> in all three futures. The big difference comes
            later: by the end of the century, the world is about 2.4 °C warmer
            if we cut emissions fast, but almost 6 °C warmer if we don't.
          </li>
          <li>
            <strong>Most places get there before the world average
            does.</strong> Land warms faster than ocean, and the far north
            warms fastest of all. The Arctic was already past 2 °C in the
            1990s.
          </li>
          <li>
            <strong>Cities can be decades apart.</strong> New York reached 2 °C
            around 2020 in this model. London is the opposite: it stays under
            2 °C through 2100 unless emissions are very high.
          </li>
          <li>
            <strong>Cutting emissions matters most for how far past 2 °C we
            go.</strong> For example, Mumbai ends the century about 2 °C warmer
            in the low-emissions future, but almost 6 °C warmer in the
            high-emissions one.
          </li>
        </ul>
      </section>

      <section>
        <h3>Limitations</h3>
        <ul>
          <li>
            This is one climate model and one run, so it shows one possible
            future, not a prediction. This model also tends to warm a bit more
            than most others.
          </li>
          <li>
            Each box covers hundreds of miles. "New York" really means the box
            that New York is in, which also includes part of the ocean.
          </li>
          <li>
            In the early 2000s the three futures look almost the same, and the
            low-emissions one even warms slightly faster at first. That's
            mostly random variation in this single run.
          </li>
        </ul>
      </section>

      <section>
        <h3>Credits</h3>
        <ul>
          <li>
            Climate data: CMIP6 CESM2-WACCM (NCAR), from Google Cloud Public
            Datasets.
          </li>
          <li>
            Coastlines: Natural Earth. Terrain: a NASA-based elevation map
            from the three-globe project.
          </li>
          <li>Built with React, three.js and d3.</li>
          <li>
            We used an AI coding assistant (Claude) to help write the code and
            this write-up.
          </li>
        </ul>
      </section>
    </article>
  );
}
