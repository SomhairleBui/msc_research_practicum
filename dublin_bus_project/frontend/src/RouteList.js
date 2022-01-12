import React from "react";
import { MemberCard } from "./components";

export const About = () => (
  <div>
    <h2>This is Team 16 summer project 2021</h2>
    <h2>List of team members</h2>
    <MemberCard
      name="Jiahud"
      role="Customer"
      intro="This is Jiahui."
      img="https://www.w3schools.com/images/img_girl.jpg"
    />
    <MemberCard
      name="Keith"
      role="Coord"
      intro="This is Keith."
      img="https://unsplash.com/photos/nKC772R_qog"
    />
    <MemberCard
      name="Sam"
      role="Code"
      intro="This is Sam."
      img="https://unsplash.com/photos/nKC772R_qog"
    />
    <MemberCard
      name="Simona"
      role="Everything"
      intro="This is Simona."
      img="https://unsplash.com/photos/nKC772R_qog"
    />
  </div>
);
