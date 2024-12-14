// // src/Routes.js
// import React from "react";
// import { Route, Routes, NavLink } from "react-router-dom";
// import Dashboard from "./pages/Dashboard";
// import Intro from "./pages/Intro";
// import Background from "./pages/Background";
// import Methodology from "./pages/Methodology";
// import Results from "./pages/Results";
// import Discussion from "./pages/Discussion";
// import Contributions from "./pages/Contributions";

// function AppRoutes() {
//   return (
//     <div className="App">
//       <div className="sidebar">
//         <NavLink to="/dashboard" className="nav-link" activeClassName="active-link">
//           <span className="icon twitter-bird"></span> Dashboard
//         </NavLink>
//         <NavLink to="/intro" className="nav-link" activeClassName="active-link">
//           <span className="icon twitter-bird"></span> Intro
//         </NavLink>
//         <NavLink to="/background" className="nav-link" activeClassName="active-link">
//           <span className="icon twitter-bird"></span> Background
//         </NavLink>
//         <NavLink to="/methodology" className="nav-link" activeClassName="active-link">
//           <span className="icon twitter-bird"></span> Methodology
//         </NavLink>
//         <NavLink to="/results" className="nav-link" activeClassName="active-link">
//           <span className="icon twitter-bird"></span> Results
//         </NavLink>
//         <NavLink to="/discussion" className="nav-link" activeClassName="active-link">
//           <span className="icon twitter-bird"></span> Discussion
//         </NavLink>
//         <NavLink to="/contributions" className="nav-link" activeClassName="active-link">
//           <span className="icon twitter-bird"></span> Contributions
//         </NavLink>
//       </div>
//       <div className="content">
//         <Routes>
//           <Route path="/dashboard" element={<Dashboard />} />
//           <Route path="/intro" element={<Intro />} />
//           <Route path="/background" element={<Background />} />
//           <Route path="/methodology" element={<Methodology />} />
//           <Route path="/results" element={<Results />} />
//           <Route path="/discussion" element={<Discussion />} />
//           <Route path="/contributions" element={<Contributions />} />
//         </Routes>
//       </div>
//     </div>
//   );
// }

// export default AppRoutes;
