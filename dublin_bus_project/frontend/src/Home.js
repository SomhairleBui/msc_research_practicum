import React from "react";

export const Home = () => (
  <>
    <header
      style={{
        backgroundImage: `url("https://miro.medium.com/max/8664/0*krBDT1IyofFbfhWt")`,
      }}
    >
      <div>
        <div class="container px-4 text-center">
          <h1 class="fw-bolder">Welcome to Journey Buster</h1>
          <p class="lead">Time prediction for Dublin bus Journeys</p>
        </div>
      </div>
    </header>
    <section>
      <div class="container px-4">
        <div class="row gx-4 justify-content-center">
          <div class="col-lg-8">
            <h2>If you know how to get to your destination</h2>
            <p class="lead">
              Use the Routes page to get live information for your journey, check for nearby bus stops and explore
                activities and accommodation, by clicking on menu at the top
                <img src="https://image.flaticon.com/icons/png/128/5376/5376422.png" width ="25px" alt="arrow!"/> of the map.
              Move the cursor or tap the screen to see the closest stops.
            </p>
          </div>
        </div>
      </div>
    </section>
    <section class="bg-light">
      <div class="container px-4">
        <div class="row gx-4 justify-content-center">
          <div class="col-lg-8">
            <h2>If not ...</h2>
            <p class="lead">
              Use the Planner page and we will recommend the shortest duration public transit solution to get to your destination, and estimate travel cost for you too.
            </p>
          </div>
        </div>
      </div>
    </section>
    <section>
      <div class="container px-4">
        <div class="row gx-4 justify-content-center">
          <div class="col-lg-8">
            <h2>Want to know more about Dublin bus services today?</h2>
            <p class="lead">
              Check the update page! This page shows all latest tweets from the official twitter accounts.
            </p>
          </div>
        </div>
      </div>
    </section>
    <section class="bg-light">
      <div class="container px-4">
        <div class="row gx-4 justify-content-center">
          <div class="col-lg-8">
            <h2>More exciting features...</h2>
            <p class="lead">
               Get a user account and log in to save your favourite stops, routes, and locations.<img src="https://image.flaticon.com/icons/png/128/4022/4022114.png" width ="25px" alt="arrow!"/>
            </p>
          </div>
        </div>
      </div>
    </section>
  </>
);
