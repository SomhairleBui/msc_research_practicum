import React from "react";
import MemberCard from "./components/MemberCard.jsx";
import { Container, Col, Row } from "react-bootstrap";
import keithPic from "./images/Keith-409x500.jpg";
import samPic from './images/Sambo_409x500.jpg';
import ucdPic from './images/ucd.PNG';
import k from './images/k.jpg'

export const About = () => (
  <div>
    <h2>Meet the team</h2>
    <Container>
      <Row className="justify-content-md-center">
        <Col xs={12} md={6} lg={3}>
          <MemberCard
            name="Jiahui"
            role="Customer Lead"
            intro=""
            img={k}
            p_link = 'https://github.com/jiahui-code'
          />
        </Col>
        <Col xs={12} md={6} lg={3}>
          <MemberCard
            name="Dr Keith Begley"
            role="Coordination Lead"
            intro=""
            img={keithPic}
            p_link = 'https://www.linkedin.com/in/keith-begley-0a306341/'
          />
        </Col>
        <Col xs={12} md={6} lg={3}>
          <MemberCard
            name="Samuel Hamilton"
            role="Code Lead"
            intro=""
            img={samPic}
            p_link = "https://www.linkedin.com/in/samilton95/"
          />
        </Col>
        <Col xs={12} md={6} lg={3}>
          <MemberCard
            name="Simona"
            role="Maintenance Lead"
            intro=""
            img={ucdPic}
          />
        </Col>
      </Row>
    </Container>
  </div>
);
