import React, { useState } from "react";
import { Popup as PopupBox } from "reactjs-popup";
import "reactjs-popup/dist/index.css";

const Popup = () => {
  // this is the user sign up popup
  // add terms and conditions and privacy policy here
  const [open, setOpen] = useState(false);
  const closeModal = () => {
    setOpen(false);
    console.log(open);
  };
  return (
    <>
      <button
        className="btn btn-link m-0 p-0 mb-1"
        onClick={() => setOpen((o) => !o)}
      >
        Terms of Service and Privacy Policy
      </button>
      <PopupBox open={open} closeOnDocumentClick modal position="right center">
        <div className="m-3">
          <h3>Terms and Conditions</h3>

          <p>
            The use of this website is subject to the following terms of use:
            <br />
            - This website is part of a research practicum project and is not
            meant for commercial use.
            <br />- The content of the pages of this website is for your general
            information and use only. It is subject to change without notice.
          </p>

          <h4>Privacy Policy</h4>
          <p>
            We may collect, store and use the following kinds of personal
            information about individuals who visit and use the website:
            <br />
            <i>Information you supply to us:</i> <br />-{" "}
            <i>username and password</i> required for login and sign up
            <br />- <i>favourite stops</i> that you select from the Map
            <br />- <i>favourite routes</i> that you select from the routes
            planner
            <br />
          </p>

          <h5>How we may use the information we collect</h5>
          <p>
            The information that you provide will be used to offer the services
            that you request from this website.
          </p>

          <h5>Disclosure of your information</h5>
          <p>Any information you provide to us will not be disclosed.</p>

          <p align="center">
            <button className="btn btn-primary" onClick={() => closeModal()}>
              OK
            </button>
          </p>
        </div>
      </PopupBox>
    </>
  );
};

export default Popup;
