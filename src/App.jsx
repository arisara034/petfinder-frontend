import Mainlayout from "./layout/Mainlayout";
import Findpet from "./layout/Findpet";
import Foundpet from "./layout/Foundpet";
import Auth from "./layout/Auth";
import Profile from "./layout/Profile";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Adopt from "./layout/Adopt";
import Login from "./layout/Login";
import Register from "./layout/Register";
import PostDetail from './layout/PostDetail'
import UserProfile from "./layout/๊UserProfile";
import EditPost from "./layout/EditPost";
import Messages from "./layout/Messages";
import AdminLayout from "./layout/admin/AdminLayout";
import AdminDashboard from "./layout/admin/AdminDashboard";
import AdminUsers from "./layout/admin/AdminUsers";
import AdminPosts from "./layout/admin/AdminPosts";
import AdminComments from "./layout/admin/AdminComments";
import AdminReports from "./layout/admin/AdminReports";

function App() {
  return (
    <Router>
      <Nav/>
      <Routes>
        {/* กำหนดพาร์ทเว็บคู่กับคอมโพเนนต์หน้าเว็บ */}
        <Route path="/" element={<Mainlayout/>} />
        <Route path="/find" element={<Findpet />} />
        <Route path="/found" element={<Foundpet />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:id" element={<UserProfile />} />
        <Route path="/adopt" element={<Adopt/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/post/:type/:id" element={<PostDetail/>} />
        <Route path="/edit-post/:type/:id" element={<EditPost/>} />
        <Route path="/messages" element={<Messages/>} />
        <Route path="/messages/:otherUserId" element={<Messages/>} />
        <Route path="/admin" element={<AdminLayout/>}>
          <Route index element={<AdminDashboard/>} />
          <Route path="users" element={<AdminUsers/>} />
          <Route path="posts" element={<AdminPosts/>} />
          <Route path="comments" element={<AdminComments/>} />
          <Route path="reports" element={<AdminReports/>} />
        </Route>
      </Routes>
      <Footer/>
    </Router>
  );
}

export default App