import React from "react";
import './GoToTopButton.css';

export default function GoToTopButton(props) {

      // add event to window on scroll
      window.onscroll = function() {scrollFunction()};

      function scrollFunction() {

        // show or hide scroll button
        let button = document.getElementById("gototop_button");

        // return if button not found
        if(!button) return;

        if (document.body.scrollTop > 40 || document.documentElement.scrollTop > 40) {
          button.style.display = "block";
        } else {
          button.style.display = "none";
        }
     }

     function scrollToTop() {
      // scroll to top of  the page
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }

     return <button id="gototop_button" className="btn btn-primary" onClick={scrollToTop}>Go to top</button>
}