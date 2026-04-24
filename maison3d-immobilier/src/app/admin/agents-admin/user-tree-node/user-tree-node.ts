// user-tree-node.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserService, UserTree } from '../../../services/user.service';

@Component({
  selector: 'app-user-tree-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-tree-node.html',
  styleUrls: ['./user-tree-node.scss']
})
export class UserTreeNodeComponent {
  @Input() node!: UserTree;
  @Input() expandedNodes: Set<number> = new Set();
  @Output() toggleNode = new EventEmitter<number>();
  @Output() viewUser = new EventEmitter<User>();
  @Output() editUser = new EventEmitter<User>();

  constructor(public userService: UserService) {}

  get isExpanded(): boolean {
    return this.expandedNodes.has(this.node.user.id);
  }

  get hasChildren(): boolean {
    return this.node.children && this.node.children.length > 0;
  }

  getInitials(prenom: string, nom: string): string {
    return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
  }

  onToggleNode(): void {
    this.toggleNode.emit(this.node.user.id);
  }

  onView(): void {
    this.viewUser.emit(this.node.user);
  }

  onEdit(): void {
    this.editUser.emit(this.node.user);
  }

  onChildToggle(nodeId: number): void {
    this.toggleNode.emit(nodeId);
  }

  onChildView(user: User): void {
    this.viewUser.emit(user);
  }

  onChildEdit(user: User): void {
    this.editUser.emit(user);
  }
}