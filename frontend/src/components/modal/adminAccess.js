import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

const AdminAccess = ({ onAccessGranted }) => {
  const isDataFetched = useRef(false);
  const [open, setOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  console.log("!");
  const handleSubmit = () => {
    if (password === "15793") {
      onAccessGranted();
      setOpen(false);
      isDataFetched.current = true;
    } else {
      setError("Неверный пароль");
    }
  };

  return (
    <Dialog open={open}>
      <DialogTitle>Доступ администратора</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label="Пароль"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="contained">
          Войти
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminAccess;
