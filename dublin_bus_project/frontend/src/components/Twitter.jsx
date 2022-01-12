import React from "react";
import { Timeline } from "react-twitter-widgets";
import { Container } from "react-bootstrap";

export default function Twitter(props) {
  return (
    <>
      <Container>
        <Timeline
          dataSource={{
            sourceType: 'list',
            ownerScreenName: 'jiahuihuang20',
            id: '1428717789225889803'
          }}
          options={{
            height: "800",
          }}
        />
      </Container>
    </>
  );
}
