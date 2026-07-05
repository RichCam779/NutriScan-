import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactoPageComponent } from './contacto-page';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ContactoPageComponent', () => {
  let component: ContactoPageComponent;
  let fixture: ComponentFixture<ContactoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactoPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
