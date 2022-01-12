import React, { useState } from "react";
import { Form, Row, Col, Button, Container } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { SignUp } from "./SignUp";
import Axios from "axios";
import { API_URL } from "./config";

export const LogIn = (props) => {
  // declare state values
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const login = async () => {
    // authenticate
    Axios.defaults.withCredentials = true;
    Axios.post(API_URL + "/account/login/", {
      username: name,
      password: password,
    })
      .then((res) => {
        // authentication with success, update App
        localStorage.setItem("user", JSON.stringify(res.data));
        props.success(res.data);
      })
      .catch(() => {
        // authentication failed
        setMessage("Wrong username or password!");
      });
  };

  return (
    <Container>
      <Router>
        <Switch>
          <Route path="/user">
            <h3>Welcome Back!</h3>
            {message && <div className="alert alert-danger">{message}</div>}

            <Row className="mb-3">
              <Form.Group as={Col} xs={12} md={6} controlId="formGridName">
                <Form.Label>User Name</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter user name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Form.Group>

              <Form.Group as={Col} xs={12} md={6} controlId="formGridPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Group>
            </Row>
            <Row>
              {/*
              <Form.Group className="mx-3" id="formGridCheckbox">
                <Form.Check type="checkbox" label="Remember me" />
              </Form.Group>
              */}

              <Form.Group className="mx-3" id="formGridButtons">
                <Button
                  className="mb-3"
                  variant="primary"
                  type="submit"
                  onClick={login}
                >
                  Login
                </Button>

                <LinkContainer to="/signup">
                  <Button variant="light" className="btn mb-3 btn-link ml-2">
                    Signup
                  </Button>
                </LinkContainer>
              </Form.Group>
            </Row>
          </Route>

          <Route path="/signup">
            <SignUp success={props.success} />
          </Route>
        </Switch>
      </Router>
    </Container>
  );
};
