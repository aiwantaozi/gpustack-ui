export default (initialState: { currentUser?: Global.UserInfo }) => {
  const canSeeAdmin = !!(
    initialState &&
    initialState.currentUser &&
    initialState.currentUser.is_admin
  );
  const canSeeUser = !!(
    initialState &&
    initialState.currentUser &&
    !initialState.currentUser.is_admin
  );

  return {
    canSeeAuthenticated: !!initialState?.currentUser,
    canSeeAdmin,
    canSeeUser,
    canDelete: true,
    canLogin: true
  };
};
