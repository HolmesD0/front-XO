import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from "socket.io-client";
import axios from "axios";
import "./index.css";

function Geometry(props) {
	const ref = useRef();
	useFrame(() => {
		let date = Date.now() * 0.001;
		ref.current.rotation.set(
			Math.cos(date) + props.rotation[0],
			Math.sin(date) + props.rotation[1],
			props.rotation[2]
		);
	});
	return (
		<mesh
			{...props}
			ref={ref}
			scale={props.shape === "X" ? 1.25 : 0.5}>
			{props.shape === "X" ? <boxGeometry attach="geometry" args={[1, 5, 1]} /> : <torusGeometry attach="geometry" args={[5, 2, 16, 100]} />}
			<meshStandardMaterial attach='material' color={props.shape === "X" ? "blue" : "red"} />
		</mesh>
	);
};

function Shape(props) {
	return (
		<Canvas onContextMenu={(event) => event.preventDefault()}>
			<ambientLight />
			<pointLight position={[10, 10, 10]} />
			{props.shape === "O" && <Geometry position={[0, 0, 0]} rotation={[0, 0, 0]} shape={props.shape} />}
			{props.shape === "X" && <Geometry position={[0, 0, 0]} rotation={[0, 0, 0.75]} shape={props.shape} />}
			{props.shape === "X" && <Geometry position={[0, 0, 0]} rotation={[0, 0, -0.75]} shape={props.shape} />}
		</Canvas>
	);
};

function All() {
	const [info, setInfo] = useState({
		user: "",
		email: "",
		password: ""
	});
	const [auth, setAuth] = useState({
		is: false,
		token: ""
	});
	const [session, setSession] = useState({
		is: false,
		data: []
	});
	const [game, setGame] = useState({
		is: false,
		room: "",
		type: ""
	});
	const [room, setRoom] = useState("");
	const [req, setReq] = useState("");
	const [res, setRes] = useState([]);
	const [cdt, setCdt] = useState(false);
	const [XO, setXO] = useState(["XO", "XO", "XO", "XO", "XO", "XO", "XO", "XO", "XO"]);
	const [socket, setSocket] = useState();

	let chat = res.map((msg, i) => { return <div className={msg.includes(auth.token) ? "chat left" : "chat right"} key={i}>{msg}</div> });
	let rooms = session.data.map((info, i) => {
		return <button key={i} onClick={() => socket.emit('room', { room: info.room, player: auth.token })}>{info.game.X} vs {info.game.O}</button>
	});
	let play = <div>
		<button onClick={() => outgame()}>Out</button>
		<table>
			<tr>
				<th onClick={() => XO[0] === "XO" && handleXO(0)}><Shape shape={XO[0]} /></th>
				<th onClick={() => XO[1] === "XO" && handleXO(1)}><Shape shape={XO[1]} /></th>
				<th onClick={() => XO[2] === "XO" && handleXO(2)}><Shape shape={XO[2]} /></th>
			</tr>
			<tr>
				<td onClick={() => XO[3] === "XO" && handleXO(3)}><Shape shape={XO[3]} /></td>
				<td onClick={() => XO[4] === "XO" && handleXO(4)}><Shape shape={XO[4]} /></td>
				<td onClick={() => XO[5] === "XO" && handleXO(5)}><Shape shape={XO[5]} /></td>
			</tr>
			<tr>
				<td onClick={() => XO[6] === "XO" && handleXO(6)}><Shape shape={XO[6]} /></td>
				<td onClick={() => XO[7] === "XO" && handleXO(7)}><Shape shape={XO[7]} /></td>
				<td onClick={() => XO[8] === "XO" && handleXO(8)}><Shape shape={XO[8]} /></td>
			</tr>
		</table>
		<input placeholder="msg" onChange={(e) => setReq(`${auth.token}: ${e.target.value}`)} />
		<button onClick={() => socket.emit('chat', { room: room, msg: req })}>chat</button>
		{chat}
	</div>
	let search = <div>
		<input placeholder="room" onChange={(e) => setRoom(e.target.value)} />
		<button onClick={() => room && socket.emit('room', { room: room, player: auth.token })}>Join</button>
		{rooms}
		<button onClick={() => outgame()}>Out</button>
	</div>
	let co = <div>
		<input placeholder="room" onChange={(e) => setRoom(e.target.value)} />
		<button onClick={() => room && socket.emit('room', { room: room, player: auth.token })}>Join</button>
		<button onClick={() => socket.emit('session')}>Session</button>
		<button onClick={() => out()}>Out</button>
	</div>
	let deco = <div className="main">
		<input type="checkbox" id="chk" aria-hidden="true" />
		<div className="signup">
			<section>
				<label htmlFor="chk" aria-hidden="true">Register</label>
				<input type="text" name="user" placeholder="User" required="" onChange={(e) => setInfo({
					user: e.target.value,
					email: info.email,
					password: info.password
				})} />
				<input type="email" name="email" placeholder="Email" required="" onChange={(e) => setInfo({
					user: info.user,
					email: e.target.value,
					password: info.password
				})} />
				<input type="password" name="pswd" placeholder="Password" required="" onChange={(e) => setInfo({
					user: info.user,
					email: info.email,
					password: e.target.value
				})} />
				<button onClick={() => register()}>Register</button>
			</section>
		</div>
		<div className="login">
			<section>
				<label htmlFor="chk" aria-hidden="true">Login</label>
				<input type="text" name="user_email" placeholder="User or Email" required="" onChange={(e) => setInfo({
					user: e.target.value,
					email: e.target.value,
					password: info.password
				})} />
				<input type="password" name="pswd" placeholder="Password" required="" onChange={(e) => setInfo({
					user: info.user,
					email: info.email,
					password: e.target.value
				})} />
				<button onClick={() => login()}>Login</button>
			</section>
		</div>
	</div>

	const login = async () => {
		await axios.post("https://nfefbs.sse.codesandbox.io/login", {
			user: info.user,
			email: info.email,
			password: info.password
		})
			.then(function (res) {
				setAuth({
					is: res.data.is,
					token: res.data.token
				});
				setSocket(io.connect("https://nfefbs.sse.codesandbox.io"));
			})
			.catch(function (err) {
				alert(err.response.data.message);
			});
	};
	const register = async () => {
		await axios.post("https://nfefbs.sse.codesandbox.io/register", {
			user: info.user,
			email: info.email,
			password: info.password
		})
			.then(function (res) {
				setAuth({
					is: res.data.is,
					token: res.data.token
				});
				setSocket(io.connect("https://nfefbs.sse.codesandbox.io"));
			})
			.catch(function (err) {
				alert(err.response.data.message);
			});
	};
	const out = () => {
		setAuth({
			is: false,
			token: ""
		});
		setSession({
			is: false,
			data: []
		});
		setGame({
			is: false,
			room: "",
			type: ""
		});
		socket.disconnect();
	};
	const outgame = () => {
		room && socket.emit('leave', room);
		setXO(["XO", "XO", "XO", "XO", "XO", "XO", "XO", "XO", "XO"]);
		setGame({
			is: false,
			room: "",
			type: ""
		});
		setSession({
			is: false,
			data: []
		});
		setRes([]);
		setRoom("");
	};
	const handleXO = async (i) => {
		let map = [...XO];
		map[i] = map[i] === "XO" ? game.type : "XO";
		cdt && setXO(map);
		cdt && socket.emit('req', { room: room, XO: map });
	};

	useEffect(() => {
		auth.is && socket.on("session", (info) => {
			setSession({
				is: true,
				data: info
			});
		});
		auth.is && socket.on("room", (data) => {
			setSession({
				is: false,
				data: []
			});
			setGame({
				is: true,
				room: data.room,
				type: data.type
			});
			setRoom(data.room);
			setXO(data.XO);
			data.type === "X" && setCdt(data.X);
			data.type === "O" && setCdt(data.O);
		});
		game.is && socket.on("res", (data) => {
			game.type === "X" && setCdt(data.play.X);
			game.type === "O" && setCdt(data.play.O);
			setRes(data.msg);
			setXO(data.XO);
		});
		game.is && socket.on("chat", (msg) => {
			setRes(msg);
		});
	}, [socket, auth, game]);
	return (
		<>
			{auth.is ? (game.is ? play : (session.is ? search : co)) : deco}
		</>
	);
};

createRoot(document.getElementById('root')).render(
	<All />,
);
