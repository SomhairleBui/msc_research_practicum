import { React, useState } from "react";
import { Row, Col, Form, Button } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import Axios from "axios";
import { API_URL } from "./config";
import Popup from "./components/Popup";

export const SignUp = (props) => {
  // declare state values
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);

  const signup = async () => {
    // send form to backend
    Axios.defaults.withCredentials = true;
    Axios.post(API_URL + `/account/signup/`, {
      username: name,
      password: password,
    })
      .then((res) => {
        // signup with success, update App
        localStorage.setItem("user", JSON.stringify(res.data));
        props.success(res.data);
      })
      .catch(() => {
        // signup failed
        setMessage("User already exists!");
      });
  };

  return (
    <>
      <h3>Sign up</h3>
      {message && <div className="alert alert-danger">{message}</div>}

      <Row className="mb-3">
        <Form.Group as={Col} xs={12} md={6} controlId="formGridName">
          <Form.Label>User Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter user name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Form.Text className="text-muted">
            This is your only identity in Dublin bus time predict site.
          </Form.Text>
        </Form.Group>
      </Row>
      <Row>
        <Form.Group as={Col} xs={12} md={6} controlId="formGridPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="At least 8 character long, including letters and number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>
        <Form.Group as={Col} xs={12} md={6} controlId="formGridPassword">
          <Form.Label>Confirm your password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Confirm your password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </Form.Group>

        <Form.Group as={Col} xs={12} md={6}>
          <div className="form-check">
            <input
              value={agree}
              onChange={(e) => {
                if (agree) setAgree(false);
                else setAgree(true);
              }}
              type="checkbox"
              className="form-check-input"
              id="agree"
            />
            <label className="form-check-label cursor-pointer" htmlFor="agree">
              I agree to the <Popup />
            </label>
          </div>
        </Form.Group>
        <Form.Group as={Row} xs={12} md={6}></Form.Group>

        <Form.Group as={Col} xs={12} md={6} controlId="formGridButtons">
          <Button
            disabled={
              !name ||
              name.length < 4 ||
              password !== password2 ||
              password.length < 8 ||
              !agree
            }
            type="submit"
            className="mb-3 btn btn-primary"
            onClick={signup}
          >
            Sign Up
          </Button>

          <LinkContainer to="/user">
            <Button variant="light" className="btn mb-3 btn-link ml-2">
              Login
            </Button>
          </LinkContainer>
        </Form.Group>
      </Row>
    </>
  );
};
