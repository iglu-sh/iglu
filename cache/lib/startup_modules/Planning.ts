export type planning_type<T> = {
    new: Array<T>;
    modified: Array<T>;
    deleted: Array<T>;
    unchanged: Array<T>;
};
